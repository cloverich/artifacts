const fs = require('fs');
const axios = require('axios');

// Configuration
const RESULTS_FILE = 'podcast_validation_results.json';
const TIMEOUT_MS = 10000;
const DELAY_MS = 1000; // Delay between API calls to be respectful

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

// Save updated results
function saveResults(results) {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

// Search Apple Podcasts API
async function searchApplePodcasts(showName) {
    try {
        console.log(`  🔍 Searching Apple Podcasts for: ${showName}`);
        const response = await axios.get('https://itunes.apple.com/search', {
            params: {
                term: showName,
                media: 'podcast',
                limit: 5
            },
            timeout: TIMEOUT_MS
        });

        const results = response.data.results || [];
        if (results.length > 0) {
            // Find best match (exact name match preferred)
            const exactMatch = results.find(r => 
                r.collectionName.toLowerCase() === showName.toLowerCase()
            );
            const bestMatch = exactMatch || results[0];
            
            console.log(`  ✅ Found on Apple Podcasts: ${bestMatch.collectionName}`);
            return {
                source: 'Apple Podcasts',
                title: bestMatch.collectionName,
                feedUrl: bestMatch.feedUrl,
                artist: bestMatch.artistName
            };
        }
        return null;
    } catch (error) {
        console.log(`  ❌ Apple Podcasts search failed: ${error.message}`);
        return null;
    }
}

// Search Podcast Index API
async function searchPodcastIndex(showName) {
    try {
        console.log(`  🔍 Searching Podcast Index for: ${showName}`);
        const response = await axios.get('https://api.podcastindex.org/api/1.0/search/byterm', {
            params: {
                q: showName,
                max: 5
            },
            timeout: TIMEOUT_MS
        });

        const results = response.data.feeds || [];
        if (results.length > 0) {
            // Find best match
            const exactMatch = results.find(r => 
                r.title.toLowerCase() === showName.toLowerCase()
            );
            const bestMatch = exactMatch || results[0];
            
            console.log(`  ✅ Found on Podcast Index: ${bestMatch.title}`);
            return {
                source: 'Podcast Index',
                title: bestMatch.title,
                feedUrl: bestMatch.url,
                author: bestMatch.author
            };
        }
        return null;
    } catch (error) {
        console.log(`  ❌ Podcast Index search failed: ${error.message}`);
        return null;
    }
}

// Search Listen Notes API
async function searchListenNotes(showName) {
    try {
        console.log(`  🔍 Searching Listen Notes for: ${showName}`);
        // Note: This requires an API key, but we'll try without first
        const response = await axios.get('https://listennotes.com/api/v2/search', {
            params: {
                q: showName,
                type: 'podcast',
                only_in: 'title',
                language: 'English'
            },
            timeout: TIMEOUT_MS
        });

        const results = response.data.results || [];
        if (results.length > 0) {
            const bestMatch = results[0];
            console.log(`  ✅ Found on Listen Notes: ${bestMatch.title_original}`);
            return {
                source: 'Listen Notes',
                title: bestMatch.title_original,
                feedUrl: bestMatch.rss,
                publisher: bestMatch.publisher_original
            };
        }
        return null;
    } catch (error) {
        console.log(`  ❌ Listen Notes search failed: ${error.message}`);
        return null;
    }
}

// Validate found RSS URL
async function validateRSSUrl(url) {
    try {
        const response = await axios.get(url, {
            timeout: TIMEOUT_MS,
            headers: {
                'User-Agent': 'Podcast URL Finder/1.0'
            }
        });
        
        const contentType = response.headers['content-type'] || '';
        const isXML = contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom');
        
        if (isXML || response.data.includes('<rss') || response.data.includes('<feed')) {
            return { isValid: true, statusCode: response.status };
        }
        return { isValid: false, error: 'Not valid RSS/XML feed' };
    } catch (error) {
        return { 
            isValid: false, 
            error: error.message,
            statusCode: error.response?.status || 'N/A'
        };
    }
}

// Search for a show across all APIs
async function searchForShow(showName) {
    console.log(`\n🎯 Searching for: ${showName}`);
    
    // Try APIs in order of priority
    const apis = [
        { name: 'Apple Podcasts', fn: searchApplePodcasts },
        { name: 'Podcast Index', fn: searchPodcastIndex },
        { name: 'Listen Notes', fn: searchListenNotes }
    ];
    
    for (const api of apis) {
        const result = await api.fn(showName);
        if (result && result.feedUrl) {
            console.log(`  🔗 Found RSS URL: ${result.feedUrl}`);
            
            // Validate the RSS URL
            const validation = await validateRSSUrl(result.feedUrl);
            if (validation.isValid) {
                console.log(`  ✅ RSS URL is valid!`);
                return {
                    ...result,
                    validation
                };
            } else {
                console.log(`  ❌ RSS URL validation failed: ${validation.error}`);
            }
        }
        
        // Delay between API calls
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
    
    console.log(`  ❌ No valid RSS URL found for: ${showName}`);
    return null;
}

// Main execution
async function main() {
    const { count } = parseArgs();
    
    console.log('🔍 Starting podcast URL search...\n');
    
    const results = loadResults();
    const badShows = results.filter(show => !show.isValid);
    
    if (badShows.length === 0) {
        console.log('No bad shows found to search for!');
        return;
    }
    
    const showsToSearch = count ? badShows.slice(0, count) : badShows;
    console.log(`Searching ${showsToSearch.length} shows (${count ? `limited to ${count}` : 'all bad shows'})...\n`);
    
    let foundCount = 0;
    let updatedCount = 0;
    
    for (const show of showsToSearch) {
        const searchResult = await searchForShow(show.title);
        
        if (searchResult) {
            foundCount++;
            
            // Update the show in results
            const showIndex = results.findIndex(r => r.xmlUrl === show.xmlUrl);
            if (showIndex !== -1) {
                results[showIndex] = {
                    ...results[showIndex],
                    xmlUrl: searchResult.feedUrl,
                    isValid: true,
                    statusCode: searchResult.validation.statusCode,
                    contentType: 'application/xml',
                    foundVia: searchResult.source,
                    originalTitle: show.title,
                    newTitle: searchResult.title
                };
                updatedCount++;
                console.log(`  📝 Updated show in results`);
            }
        }
        
        // Delay between shows
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
    
    // Save updated results
    saveResults(results);
    
    console.log(`\n=== SEARCH COMPLETE ===`);
    console.log(`Searched: ${showsToSearch.length} shows`);
    console.log(`Found: ${foundCount} shows`);
    console.log(`Updated: ${updatedCount} shows`);
    console.log(`Results saved to: ${RESULTS_FILE}`);
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { searchForShow, searchApplePodcasts, searchPodcastIndex, searchListenNotes };
