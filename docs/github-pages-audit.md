# GitHub Pages readiness audit

Reviewed 10 October 2026. Measurements are local, uncompressed file sizes from the completed publication build, rounded to the nearest tenth of a KiB. This audit concerns the checkout, not an already configured GitHub repository.

## Repository setup

There is one active root Git checkout on `main`, with no configured remote. At the user's request, Git was reinitialized on 10 October 2026 with a clean source snapshot, purging the old object database and `.git/scanground-history.git`. Downloaded feed history is no longer reachable or retained in this checkout. Experimental source, ignored local downloads, and dependencies were preserved; unused React/Vite starter logos were removed; the downloaded feeds remain ignored and are not published.

The fresh snapshot includes the browser artifacts, collection index/build/workflow, utility source and lockfile, and documentation. `get_reading_list.py` is a source-only Safari utility: no reading-list export is committed or published. Historical commit IDs in older research notes identify retired revisions and no longer resolve locally; reference URLs and evidence remain in the analyses.

## Published artifacts

| Artifact | Preparation | Published size |
| --- | --- | ---: |
| Clip Path | Copy standalone HTML | 15.0 KiB |
| Sound Lab | Copy standalone HTML | 34.1 KiB |
| Oxide Header Lab | Copy HTML, CSS, JS, research Markdown | 23.6 KiB |
| Tunnel / Signal Lab | Dependency-free Node bundler | 38.3 KiB |
| Motion Accent Lab | Locked Anime.js dependency + Node bundler | 155.0 KiB |
| Exploded Atlas | Dependency-free Node bundler | 41.3 KiB |
| Scanground | Locked React/TypeScript/Vite build | 364.1 KiB |
| Index + utility documentation | Copy root HTML and OPML README | About 8 KiB |

The initial publication has 15 files and totals **679.5 KiB (about 0.66 MiB)**. Its largest file is Scanground's JavaScript at 339.9 KiB; Vite reports about 110.6 KiB gzip for that script. Motion Accent's portable HTML includes the full Anime.js bundle, license, and research. Neither needs size optimization for occasional review. Assets load only when opening the respective artifact; the index does not preload them.

GitHub documents a **1 GB published-site limit**, a recommended **1 GB source-repository limit**, a **100 GB/month soft bandwidth limit**, and a **10-minute deployment timeout**. The 10-builds/hour soft limit does not apply to a custom Actions workflow. This collection is comfortably within those published limits. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

Git warns for individual files above 50 MiB and blocks files above 100 MiB. The fresh snapshot contains small source files. Git LFS is configured for future intentional binary assets, while generated data remains ignored. [GitHub large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)

## Changes required for hosting, now implemented

- A buildless root index links to all seven browser artifacts and clearly identifies the OPML utility as command-line documentation.
- A Node build script bundles the three labs, builds Scanground, and copies an explicit publication allowlist into ignored `_site/`. Uploading the repository root would publish unintended files and would miss ignored lab bundles in a clean checkout.
- Scanground now uses Vite's relative `base` and React Router's `HashRouter`. The former root-relative assets and browser-history routes would fail under a repository prefix or on route reloads. Hash routes avoid requiring server rewrites. [Vite relative base](https://vite.dev/guide/build.html#relative-base), [React Router HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter)
- Scanground's sample was an ignored 2.3 MiB local photograph at `/img/IMG_3976.JPG`; a fresh checkout could not render it. It now imports a small original SVG. Vite's public-directory copying is disabled so the four ignored local photographs (about 15.3 MiB combined) cannot accidentally enter deployment. Future intentional assets should be imported from source or deliberately added to the publication build.
- OPML downloaded feeds, generated OPML output, and validation result JSON now have project ignore rules. The local downloaded feeds occupy about 194 MiB. The utility performs network validation/downloads from Node and is not a Pages web application; CI publishes its README only and never runs its scripts.

## CI and deployment

The checked-in workflow downloads LFS content at checkout, uses Node 22, `npm ci --ignore-scripts` for Scanground and Motion Accent, and caching keyed by their committed npm lockfiles. No root dependency manager or workspace conversion is necessary. The other projects use Node built-ins or direct HTML/CSS/JS.

CI runs the existing seven mechanics tests, checks Oxide's JavaScript syntax, runs Scanground's TypeScript and Vite production build, invokes the three lab builders' embedded validation, and checks the publication's local HTML links/assets and total size. Pull requests get the same validation without deployment. Builds do not scrape reference sites or make feed/API requests. Registry access is required for dependency installation on a cold runner; the application font links are runtime browser requests.

A dependent deploy job runs only from `main`, uses the `github-pages` environment, and grants only that job `pages: write` and `id-token: write`. GitHub's upload action packages `_site/`; configure-pages and deploy-pages handle publication. Enable **GitHub Actions** as the Pages source after creating the repository. [GitHub custom workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Remaining limits and verification

The site is static: no server persistence, user accounts, or backend APIs. Sound requires a user gesture, and Tunnel relies on browser WebGL2 support. Clip Path and Scanground request Google Fonts, with CSS font fallbacks; the other artifact runtimes are local. Scanground's Gallery and Settings are existing “Coming soon” placeholders, and its image-upload functionality from the README specification is not implemented. This hosting work does not turn those placeholders into finished features.

Local verification: locked dependency installs and the publication build pass in a copy containing only commit-eligible source, with identical output to the working checkout; the seven mechanics tests pass; all seven index links were opened in a browser under `/artifacts/`, with no console errors observed. Scanground's Gallery hash route survives reload. The index was checked at desktop and mobile widths. The HTML-link checker does not crawl external reference links, parse every JavaScript-generated URL, or replace browser interaction testing. This change verifies collection navigation and hosting compatibility, not every pre-existing artifact control. Vite reports outdated browser-data warnings, but the build passes; dependency upgrades are separate work.

No GitHub deployment has run: there is no configured remote, and repository/Pages settings are still required. These local checks cannot confirm account eligibility, Actions availability, or repository environment policies. GitHub Free supports Pages for public repositories; private-repository Pages availability depends on the account plan. [Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

## Future assets and provenance

The committed `.gitattributes` selects common binary media/document/model/archive formats for LFS, with case-insensitive extension patterns. Git LFS is installed locally with its pre-push hook; fresh clones need Git LFS installed as well. Text, SVG, and source remain ordinary Git files. LFS separates binary content from Git history through pointers; it is extension-based here, not an automatic size cap, and GitHub LFS quotas still apply. [Git LFS configuration](https://docs.github.com/en/repositories/working-with-files/managing-large-files/configuring-git-large-file-storage)

The custom workflow materializes LFS objects before copying actual files into the static publication. This is distinct from asking Pages to resolve LFS pointers. [Checkout LFS option](https://github.com/actions/checkout#usage)

AGENTS.md now requires a brief pre-commit review for size, privacy, copyright, and provenance. Sample media we do not own is referenced by name and source link rather than published. Existing hosted graphics are original procedural/SVG work; Anime.js is bundled with its MIT license. No local photographs or downloaded podcast media are included in publication.
