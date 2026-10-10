const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Configuration
const RESULTS_FILE = 'podcast_validation_results.json';
const DATA_DIR = 'data';
const SHOWS_DIR = path.join(DATA_DIR, 'shows');
const TIMEOUT_MS = 15000;
const DELAY_MS = 500; // Delay between downloads

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const countIndex = args.indexOf('-n');
    const count = countIndex !== -1 && args[countIndex + 1] ? parseInt(args[countIndex + 1]) : null;
    return { count };
}

// Load existing results
function loadResults() {
    try {
        const data = fs.readFileSync(RESULTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading results file:', error.message);
        process.exit(1);
    }
}

// Sanitize filename for filesystem safety
function sanitizeFilename(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Create directory if it doesn't exist
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Check if file already exists
function fileExists(showName) {
    const filename = `${sanitizeFilename(showName)}.xml`;
    const filePath = path.join(SHOWS_DIR, filename);
    return fs.existsSync(filePath);
}

// Download RSS feed
async function downloadFeed(show) {
    const filename = `${sanitizeFilename(show.title)}.xml`;
    const filePath = path.join(SHOWS_DIR, filename);
    
    try {
        console.log(`  📥 Downloading: ${show.title}`);
        console.log(`  🔗 URL: ${show.xmlUrl}`);
        
        const response = await axios.get(show.xmlUrl, {
            timeout: TIMEOUT_MS,
            headers: {
                'User-Agent': 'Podcast Feed Downloader/1.0'
            }
        });
        
        // Write to file
        fs.writeFileSync(filePath, response.data);
        
        console.log(`  ✅ Saved: ${filename}`);
        return {
            success: true,
            filename,
            size: response.data.length,
            statusCode: response.status
        };
        
    } catch (error) {
        console.log(`  ❌ Download failed: ${error.message}`);
        return {
            success: false,
            filename,
            error: error.message,
            statusCode: error.response?.status || 'N/A'
        };
    }
}

// Main execution
async function main() {
    const { count } = parseArgs();
    
    console.log('📥 Starting RSS feed download...\n');
    
    // Ensure directories exist
    ensureDir(DATA_DIR);
    ensureDir(SHOWS_DIR);
    
    const results = loadResults();
    const goodShows = results.filter(show => show.isValid);
    
    if (goodShows.length === 0) {
        console.log('No valid shows found to download!');
        return;
    }
    
    // Filter out already downloaded shows
    const showsToDownload = goodShows.filter(show => !fileExists(show.title));
    
    if (showsToDownload.length === 0) {
        console.log('All feeds have already been downloaded!');
        return;
    }
    
    const limitedShows = count ? showsToDownload.slice(0, count) : showsToDownload;
    
    console.log(`Found ${goodShows.length} valid shows`);
    console.log(`Already downloaded: ${goodShows.length - showsToDownload.length}`);
    console.log(`To download: ${showsToDownload.length}`);
    console.log(`Processing: ${limitedShows.length} (${count ? `limited to ${count}` : 'all remaining'})\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const show of limitedShows) {
        console.log(`\n🎯 Processing: ${show.title}`);
        
        const result = await downloadFeed(show);
        
        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
        
        // Delay between downloads
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
    
    console.log(`\n=== DOWNLOAD COMPLETE ===`);
    console.log(`Downloaded: ${successCount} feeds`);
    console.log(`Failed: ${failCount} feeds`);
    console.log(`Saved to: ${SHOWS_DIR}/`);
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { downloadFeed, sanitizeFilename, ensureDir };
