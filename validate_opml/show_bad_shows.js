const fs = require('fs');

// Configuration
const RESULTS_FILE = 'podcast_validation_results.json';

// Load and parse results
function loadResults() {
    try {
        const data = fs.readFileSync(RESULTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading results file:', error.message);
        process.exit(1);
    }
}

// Display bad shows in hacker style
function showBadShows() {
    const results = loadResults();
    const badShows = results.filter(show => !show.isValid);
    
    console.log(`\n🔴 BAD SHOWS (${badShows.length}/${results.length}):\n`);
    
    badShows.forEach(show => {
        const status = show.statusCode || 'N/A';
        const error = show.error || 'Unknown error';
        console.log(`${show.title} | ${status} | ${error}`);
    });
    
    console.log(`\n📊 Summary: ${badShows.length} bad, ${results.length - badShows.length} good\n`);
}

// Main execution
if (require.main === module) {
    showBadShows();
}

module.exports = { loadResults, showBadShows };
