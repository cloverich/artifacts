const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Configuration
const RESULTS_FILE = 'podcast_validation_results.json';
const OUTPUT_DIR = 'data/opml';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'hn_ai_recs.opml');
const SHOWS_DIR = 'data/shows';

// Load validation results
function loadResults() {
    try {
        const data = fs.readFileSync(RESULTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading results file:', error.message);
        process.exit(1);
    }
}

// Create directory if it doesn't exist
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Escape XML special characters
function escapeXml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Check if a show has at least one episode
async function hasEpisodes(show) {
    try {
        const filename = `${sanitizeFilename(show.title)}.xml`;
        const filePath = path.join(SHOWS_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            console.log(`  ⚠️  No local file found for: ${show.title}`);
            return false;
        }
        
        const xmlData = fs.readFileSync(filePath, 'utf8');
        
        // Quick check for item/entry elements
        const hasItems = xmlData.includes('<item>') || xmlData.includes('<entry>');
        if (!hasItems) {
            console.log(`  ❌ No episodes found in: ${show.title}`);
            return false;
        }
        
        // Parse and count episodes more accurately
        const parser = new xml2js.Parser({
            strict: false,
            trim: true,
            explicitArray: false,
            ignoreAttrs: false,
            mergeAttrs: true
        });
        
        const result = await parser.parseStringPromise(xmlData);
        
        let episodeCount = 0;
        if (result.RSS && result.RSS.CHANNEL && result.RSS.CHANNEL.ITEM) {
            episodeCount = Array.isArray(result.RSS.CHANNEL.ITEM) ? result.RSS.CHANNEL.ITEM.length : 1;
        } else if (result.FEED && result.FEED.ENTRY) {
            episodeCount = Array.isArray(result.FEED.ENTRY) ? result.FEED.ENTRY.length : 1;
        }
        
        if (episodeCount === 0) {
            console.log(`  ❌ No episodes found in: ${show.title}`);
            return false;
        }
        
        console.log(`  ✅ ${show.title}: ${episodeCount} episodes`);
        return true;
        
    } catch (error) {
        console.log(`  ❌ Error checking episodes for ${show.title}: ${error.message}`);
        return false;
    }
}

// Sanitize filename for filesystem safety (same as download_feeds.js)
function sanitizeFilename(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Generate OPML content
function generateOPML(validShows) {
    // Group shows by category
    const showsByCategory = {};
    validShows.forEach(show => {
        if (!showsByCategory[show.category]) {
            showsByCategory[show.category] = [];
        }
        showsByCategory[show.category].push(show);
    });

    // Sort categories alphabetically
    const sortedCategories = Object.keys(showsByCategory).sort();

    // Build OPML content
    let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>HN AI Recommendations: Validated Tech Podcasts</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
    <dateModified>${new Date().toUTCString()}</dateModified>
  </head>
  <body>

`;

    // Add each category
    sortedCategories.forEach(category => {
        const shows = showsByCategory[category];
        
        // Sort shows alphabetically within category
        shows.sort((a, b) => a.title.localeCompare(b.title));
        
        opml += `    <outline text="${escapeXml(category)}">
`;
        
        // Add each show in the category
        shows.forEach(show => {
            const title = show.newTitle || show.title;
            opml += `      <outline text="${escapeXml(title)}" xmlUrl="${escapeXml(show.xmlUrl)}"/>
`;
        });
        
        opml += `    </outline>

`;
    });

    opml += `  </body>
</opml>`;

    return opml;
}

// Main execution
async function main() {
    console.log('📝 Generating OPML from validated results...\n');
    
    // Ensure output directory exists
    ensureDir(OUTPUT_DIR);
    
    // Load results
    const results = loadResults();
    const validShows = results.filter(show => show.isValid);
    
    if (validShows.length === 0) {
        console.log('No valid shows found to include in OPML!');
        return;
    }
    
    console.log(`Found ${validShows.length} valid shows across ${new Set(validShows.map(s => s.category)).size} categories`);
    console.log('\n🔍 Checking for episodes in downloaded feeds...\n');
    
    // Filter shows that have episodes
    const showsWithEpisodes = [];
    for (const show of validShows) {
        console.log(`Checking: ${show.title}`);
        const hasEps = await hasEpisodes(show);
        if (hasEps) {
            showsWithEpisodes.push(show);
        }
    }
    
    console.log(`\n📊 Episode validation complete:`);
    console.log(`  Valid shows: ${validShows.length}`);
    console.log(`  Shows with episodes: ${showsWithEpisodes.length}`);
    console.log(`  Shows without episodes: ${validShows.length - showsWithEpisodes.length}`);
    
    if (showsWithEpisodes.length === 0) {
        console.log('No shows with episodes found!');
        return;
    }
    
    // Generate OPML content
    const opmlContent = generateOPML(showsWithEpisodes);
    
    // Write to file
    fs.writeFileSync(OUTPUT_FILE, opmlContent);
    
    console.log(`\n✅ Generated OPML file: ${OUTPUT_FILE}`);
    console.log(`📊 Included ${showsWithEpisodes.length} shows with episodes`);
    
    // Show category breakdown
    const categoryCounts = {};
    showsWithEpisodes.forEach(show => {
        categoryCounts[show.category] = (categoryCounts[show.category] || 0) + 1;
    });
    
    console.log('\n📋 Category breakdown:');
    Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, count]) => {
            console.log(`  ${category}: ${count} shows`);
        });
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { generateOPML, loadResults };
