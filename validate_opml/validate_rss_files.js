const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const countIndex = args.indexOf('-n');
    const count = countIndex !== -1 && args[countIndex + 1] ? parseInt(args[countIndex + 1]) : null;
    
    // Get directory argument (default to data/shows)
    // Skip -n and its value when looking for directory
    const nonFlagArgs = args.filter((arg, index) => {
        if (arg === '-n') return false;
        if (index > 0 && args[index - 1] === '-n') return false;
        return !arg.startsWith('-');
    });
    
    const directory = nonFlagArgs.length > 0 ? nonFlagArgs[0] : 'data/shows';
    
    return { count, directory };
}

// Get all XML files in directory
function getXMLFiles(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            console.error(`Directory does not exist: ${dirPath}`);
            process.exit(1);
        }
        
        const files = fs.readdirSync(dirPath);
        return files
            .filter(file => file.endsWith('.xml'))
            .map(file => path.join(dirPath, file));
    } catch (error) {
        console.error(`Error reading directory: ${error.message}`);
        process.exit(1);
    }
}

// Validate RSS structure
function validateRSSStructure(xmlData) {
    const issues = [];
    
    try {
        // Basic XML structure check
        if (!xmlData.includes('<rss') && !xmlData.includes('<feed')) {
            issues.push('Not a valid RSS or Atom feed');
            return { isValid: false, issues, type: 'unknown' };
        }
        
        // Determine feed type
        const isRSS = xmlData.includes('<rss');
        const isAtom = xmlData.includes('<feed') && xmlData.includes('xmlns="http://www.w3.org/2005/Atom"');
        
        if (isRSS) {
            return validateRSSFeed(xmlData);
        } else if (isAtom) {
            return validateAtomFeed(xmlData);
        } else {
            issues.push('Unknown feed format');
            return { isValid: false, issues, type: 'unknown' };
        }
        
    } catch (error) {
        issues.push(`Parse error: ${error.message}`);
        return { isValid: false, issues, type: 'error' };
    }
}

// Validate RSS feed structure
async function validateRSSFeed(xmlData) {
    const issues = [];
    
    try {
        const parser = new xml2js.Parser({
            strict: false,
            trim: true,
            explicitArray: false,
            ignoreAttrs: false,
            mergeAttrs: true
        });
        
        const result = await parser.parseStringPromise(xmlData);
        
        // Check RSS structure (XML parser converts to uppercase)
        if (!result.RSS) {
            issues.push('Missing RSS root element');
            return { isValid: false, issues, type: 'rss' };
        }
        
        if (!result.RSS.CHANNEL) {
            issues.push('Missing channel element');
            return { isValid: false, issues, type: 'rss' };
        }
        
        const channel = result.RSS.CHANNEL;
        
        // Check required channel elements
        if (!channel.TITLE) issues.push('Missing channel title');
        if (!channel.DESCRIPTION) issues.push('Missing channel description');
        if (!channel.LINK) issues.push('Missing channel link');
        
        // Check for items/episodes
        if (!channel.ITEM && !channel.ITEMS) {
            issues.push('No episodes found (missing item elements)');
        } else {
            const items = channel.ITEM ? (Array.isArray(channel.ITEM) ? channel.ITEM : [channel.ITEM]) : [];
            if (items.length === 0) {
                issues.push('No episodes found');
            } else {
                // Check first item structure
                const firstItem = items[0];
                if (!firstItem.TITLE) issues.push('Episodes missing title');
                if (!firstItem.LINK && !firstItem.ENCLOSURE) issues.push('Episodes missing link or enclosure');
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues,
            type: 'rss',
            channelTitle: channel.TITLE,
            episodeCount: channel.ITEM ? (Array.isArray(channel.ITEM) ? channel.ITEM.length : 1) : 0
        };
        
    } catch (error) {
        issues.push(`RSS parse error: ${error.message}`);
        return { isValid: false, issues, type: 'rss' };
    }
}

// Validate Atom feed structure
async function validateAtomFeed(xmlData) {
    const issues = [];
    
    try {
        const parser = new xml2js.Parser({
            strict: false,
            trim: true,
            explicitArray: false,
            ignoreAttrs: false,
            mergeAttrs: true
        });
        
        const result = await parser.parseStringPromise(xmlData);
        
        // Check Atom structure
        if (!result.feed) {
            issues.push('Missing feed root element');
            return { isValid: false, issues, type: 'atom' };
        }
        
        const feed = result.feed;
        
        // Check required feed elements
        if (!feed.title) issues.push('Missing feed title');
        if (!feed.subtitle && !feed.description) issues.push('Missing feed description');
        if (!feed.link) issues.push('Missing feed link');
        
        // Check for entries/episodes
        if (!feed.entry && !feed.entries) {
            issues.push('No episodes found (missing entry elements)');
        } else {
            const entries = feed.entry ? (Array.isArray(feed.entry) ? feed.entry : [feed.entry]) : [];
            if (entries.length === 0) {
                issues.push('No episodes found');
            } else {
                // Check first entry structure
                const firstEntry = entries[0];
                if (!firstEntry.title) issues.push('Episodes missing title');
                if (!firstEntry.link) issues.push('Episodes missing link');
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues,
            type: 'atom',
            feedTitle: feed.title,
            episodeCount: feed.entry ? (Array.isArray(feed.entry) ? feed.entry.length : 1) : 0
        };
        
    } catch (error) {
        issues.push(`Atom parse error: ${error.message}`);
        return { isValid: false, issues, type: 'atom' };
    }
}

// Validate a single RSS file
async function validateRSSFile(filePath) {
    const filename = path.basename(filePath);
    
    try {
        console.log(`  🔍 Validating: ${filename}`);
        
        const xmlData = fs.readFileSync(filePath, 'utf8');
        const validation = await validateRSSStructure(xmlData);
        
        if (validation.isValid) {
            const title = validation.channelTitle || validation.feedTitle || 'Unknown';
            const count = validation.episodeCount || 0;
            console.log(`  ✅ Valid ${validation.type.toUpperCase()} feed: "${title}" (${count} episodes)`);
        } else {
            console.log(`  ❌ Invalid ${validation.type.toUpperCase()} feed:`);
            validation.issues.forEach(issue => {
                console.log(`    - ${issue}`);
            });
        }
        
        return {
            filename,
            ...validation,
            fileSize: xmlData.length
        };
        
    } catch (error) {
        console.log(`  ❌ File read error: ${error.message}`);
        return {
            filename,
            isValid: false,
            issues: [`File read error: ${error.message}`],
            type: 'error'
        };
    }
}

// Main execution
async function main() {
    const { count, directory } = parseArgs();
    
    console.log(`🔍 Starting RSS file validation...\n`);
    console.log(`Directory: ${directory}`);
    
    const xmlFiles = getXMLFiles(directory);
    
    if (xmlFiles.length === 0) {
        console.log('No XML files found in directory!');
        return;
    }
    
    const filesToValidate = count ? xmlFiles.slice(0, count) : xmlFiles;
    
    console.log(`Found ${xmlFiles.length} XML files`);
    console.log(`Validating: ${filesToValidate.length} (${count ? `limited to ${count}` : 'all files'})\n`);
    
    let validCount = 0;
    let invalidCount = 0;
    const results = [];
    
    for (const filePath of filesToValidate) {
        console.log(`\n🎯 Processing: ${path.basename(filePath)}`);
        
        const result = await validateRSSFile(filePath);
        results.push(result);
        
        if (result.isValid) {
            validCount++;
        } else {
            invalidCount++;
        }
    }
    
    console.log(`\n=== VALIDATION COMPLETE ===`);
    console.log(`Valid feeds: ${validCount}`);
    console.log(`Invalid feeds: ${invalidCount}`);
    console.log(`Total processed: ${results.length}`);
    
    if (invalidCount > 0) {
        console.log(`\n❌ Invalid feeds:`);
        results
            .filter(r => !r.isValid)
            .forEach(r => {
                console.log(`  ${r.filename}: ${r.issues.join(', ')}`);
            });
    }
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { validateRSSFile, validateRSSStructure, getXMLFiles };
