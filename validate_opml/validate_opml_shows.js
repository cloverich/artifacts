const fs = require('fs');
const xml2js = require('xml2js');
const axios = require('axios');

// Configuration
const OPML_FILE = 'hn_starter_podcasts_larg.opml';
const RESULTS_FILE = 'podcast_validation_results.json';
const TIMEOUT_MS = 10000; // 10 seconds timeout per request
const MAX_CONCURRENT = 5; // Limit concurrent requests to be respectful

// Parse OPML file and extract shows
async function parseOPML() {
    try {
        const opmlContent = fs.readFileSync(OPML_FILE, 'utf8');
        const parser = new xml2js.Parser({
            strict: false,
            trim: true,
            explicitArray: false,
            ignoreAttrs: false,
            mergeAttrs: true
        });
        const result = await parser.parseStringPromise(opmlContent);
        
        const shows = [];
        const categories = result.OPML.BODY.OUTLINE;
        
        // Handle both single category and array of categories
        const categoryList = Array.isArray(categories) ? categories : [categories];
        
        for (const category of categoryList) {
            const categoryName = category.TEXT;
            if (category.OUTLINE) {
                const showList = Array.isArray(category.OUTLINE) ? category.OUTLINE : [category.OUTLINE];
                for (const show of showList) {
                    shows.push({
                        title: show.TEXT,
                        xmlUrl: show.XMLURL,
                        category: categoryName
                    });
                }
            }
        }
        
        console.log(`Found ${shows.length} shows across ${categoryList.length} categories`);
        return shows;
    } catch (error) {
        console.error('Error parsing OPML file:', error);
        throw error;
    }
}

// Validate a single podcast URL
async function validatePodcastUrl(show) {
    try {
        console.log(`Validating: ${show.title}`);
        
        const response = await axios.get(show.xmlUrl, {
            timeout: TIMEOUT_MS,
            headers: {
                'User-Agent': 'Podcast Validator/1.0'
            },
            maxRedirects: 5
        });
        
        // Check if response is XML and contains RSS-like content
        const contentType = response.headers['content-type'] || '';
        const isXML = contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom');
        
        if (!isXML && !response.data.includes('<rss') && !response.data.includes('<feed')) {
            throw new Error('Response is not valid RSS/XML feed');
        }
        
        // Basic validation - check for common RSS/Atom elements
        const hasRSS = response.data.includes('<rss') || response.data.includes('<channel>');
        const hasAtom = response.data.includes('<feed') && response.data.includes('xmlns="http://www.w3.org/2005/Atom"');
        
        if (!hasRSS && !hasAtom) {
            throw new Error('Response does not contain valid RSS or Atom feed structure');
        }
        
        console.log(`✓ Valid: ${show.title}`);
        return {
            ...show,
            isValid: true,
            statusCode: response.status,
            contentType: contentType
        };
        
    } catch (error) {
        console.log(`✗ Invalid: ${show.title} - ${error.message}`);
        return {
            ...show,
            isValid: false,
            error: error.message,
            statusCode: error.response?.status || 'N/A'
        };
    }
}

// Load existing results if available
function loadExistingResults() {
    try {
        if (fs.existsSync(RESULTS_FILE)) {
            const existingData = fs.readFileSync(RESULTS_FILE, 'utf8');
            return JSON.parse(existingData);
        }
    } catch (error) {
        console.log('No existing results file found or error reading it, starting fresh');
    }
    return [];
}

// Process shows in batches to avoid overwhelming servers
async function processShowsInBatches(shows, batchSize = MAX_CONCURRENT) {
    const existingResults = loadExistingResults();
    const results = [...existingResults];
    
    // Find shows that haven't been validated yet
    const existingUrls = new Set(existingResults.map(r => r.xmlUrl));
    const showsToValidate = shows.filter(show => !existingUrls.has(show.xmlUrl));
    
    if (showsToValidate.length === 0) {
        console.log('All shows have already been validated!');
        return results;
    }
    
    console.log(`Found ${existingResults.length} previously validated shows`);
    console.log(`Validating ${showsToValidate.length} new shows...`);
    
    for (let i = 0; i < showsToValidate.length; i += batchSize) {
        const batch = showsToValidate.slice(i, i + batchSize);
        console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(showsToValidate.length / batchSize)} (${batch.length} shows)`);
        
        const batchPromises = batch.map(show => validatePodcastUrl(show));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to be respectful
        if (i + batchSize < showsToValidate.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return results;
}

// Write results to JSON file
function writeResults(results) {
    const goodShows = results.filter(show => show.isValid);
    const badShows = results.filter(show => !show.isValid);
    
    // Write all results to a single file with isValid field
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    
    console.log(`\n=== VALIDATION COMPLETE ===`);
    console.log(`Total shows: ${results.length}`);
    console.log(`Valid shows: ${goodShows.length}`);
    console.log(`Invalid shows: ${badShows.length}`);
    console.log(`Results saved to: ${RESULTS_FILE}`);
    
    if (badShows.length > 0) {
        console.log(`\nInvalid shows:`);
        badShows.forEach(show => {
            console.log(`  - ${show.title}: ${show.error}`);
        });
    }
}

// Main execution
async function main() {
    try {
        console.log('Starting podcast validation...\n');
        
        const shows = await parseOPML();
        const results = await processShowsInBatches(shows);
        writeResults(results);
        
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { parseOPML, validatePodcastUrl, processShowsInBatches };
