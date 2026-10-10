# Podcast OPML Validation System

## Purpose
Validates podcast URLs from OPML files and recovers working RSS feeds for podcast applications.

## Scripts

### `validate_opml_shows.js`
**Purpose**: Parse OPML file and validate all podcast URLs
**Input**: `hn_starter_podcasts_larg.opml` (hardcoded)
**Output**: `podcast_validation_results.json` (array of show objects with `isValid` field)
**Behavior**: 
- Idempotent: skips already validated URLs
- Validates RSS/XML feed structure
- Respectful rate limiting (5 concurrent, 1s delays)
- Updates existing results file

### `find_podcast_urls.js`
**Purpose**: Search for working RSS URLs for invalid shows
**Input**: Reads `podcast_validation_results.json`
**Output**: Updates `podcast_validation_results.json` with new URLs
**Args**: `-n <count>` (limit number of shows to search)
**Behavior**:
- Searches Apple Podcasts → Podcast Index → Listen Notes APIs
- Validates found URLs before updating
- Idempotent: skips already validated shows
- Updates results with `foundVia`, `newTitle`, new `xmlUrl`

### `download_feeds.js`
**Purpose**: Download RSS feeds to local files
**Input**: Reads `podcast_validation_results.json` (valid shows only)
**Output**: `data/shows/*.xml` files
**Args**: `-n <count>` (limit downloads)
**Behavior**:
- Idempotent: skips already downloaded files
- Sanitizes filenames (`"Show Name"` → `"show-name.xml"`)
- Creates `data/shows/` directory
- 500ms delays between downloads

### `validate_rss_files.js`
**Purpose**: Validate downloaded RSS files for structure
**Input**: Directory of XML files (default: `data/shows/`)
**Output**: Console validation report
**Args**: `[directory] -n <count>`
**Behavior**:
- Validates RSS/Atom feed structure
- Checks for required elements (title, description, episodes)
- Reports episode counts and missing elements
- Handles both RSS and Atom formats

### `show_bad_shows.js`
**Purpose**: Display invalid shows in readable format
**Input**: Reads `podcast_validation_results.json`
**Output**: Console list of bad shows with status codes
**Behavior**:
- Filters `isValid: false` shows
- One-line format: `Show Name | Status | Error`

### `generate_opml.js`
**Purpose**: Generate new OPML file from validated results
**Input**: Reads `podcast_validation_results.json` (valid shows only)
**Output**: `data/opml/hn_ai_recs.opml`
**Behavior**:
- Groups shows by category
- Sorts categories and shows alphabetically
- Uses `newTitle` if available, falls back to `title`
- Escapes XML special characters (& → &amp;)
- Validates each show has episodes in downloaded XML files
- Excludes shows with 0 episodes (e.g., empty feeds)
- Creates `data/opml/` directory

## Data Flow
1. `validate_opml_shows.js` → `podcast_validation_results.json`
2. `find_podcast_urls.js` → updates `podcast_validation_results.json`
3. `download_feeds.js` → `data/shows/*.xml`
4. `validate_rss_files.js` → validates `data/shows/*.xml`
5. `show_bad_shows.js` → displays invalid shows
6. `generate_opml.js` → `data/opml/hn_ai_recs.opml`

## OPML Format
Standard OPML 2.0 format with hierarchical structure:
```xml
<opml version="2.0">
  <head>
    <title>...</title>
    <dateCreated>...</dateCreated>
    <dateModified>...</dateModified>
  </head>
  <body>
    <outline text="Category Name">
      <outline text="Show Name" xmlUrl="https://feed.url/rss"/>
    </outline>
  </body>
</opml>
```

## Key Files
- `podcast_validation_results.json`: Master results with `isValid` field
- `data/shows/*.xml`: Downloaded RSS feeds
- `data/opml/hn_ai_recs.opml`: Generated validated OPML file
- `hn_starter_podcasts_larg.opml`: Source OPML file

## Publication boundary

This is a Node command-line utility, not a browser application. The collection's GitHub Pages build publishes this README only. Downloaded feeds, validation results, and generated OPML files remain local and are ignored; keep the source scripts, package manifest, lockfile, and source OPML in Git if committing this utility. The collection CI does not run feed validation, API searches, or downloads.
