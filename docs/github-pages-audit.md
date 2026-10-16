# GitHub Pages publication audit

Reviewed 16 October 2026. This document describes the checked-in publication path. The current GitHub Actions deployment is the authority for the live site.

## Publication boundary

The repository is [cloverich/artifacts](https://github.com/cloverich/artifacts), with a static collection at [cloverich.github.io/artifacts](https://cloverich.github.io/artifacts/). GitHub Pages uses **GitHub Actions** as its build source. The workflow uploads only ignored `_site/`, never the checkout root.

`scripts/build-pages.mjs` builds the five standalone bundles, renders the complete styling studies, copies an explicit file allowlist, checks internal HTML links/assets, and reports uncompressed file sizes. It rejects root-relative links, missing local targets, publication symlinks, links escaping the publication directory, and output at or above its 1 GB budget. It does not crawl external inspiration/source links or discover URLs created by JavaScript.

| Publication | Preparation |
| --- | --- |
| Collection | Static root HTML and original Signal Press SVG specimen |
| Signal Press 01 | Standalone authored HTML and SVG |
| Steward | Dependency-free Node bundler |
| Soundscape | Dependency-free Node bundler; MIT-attributed Foley sprite embedded |
| Exploded Atlas | Dependency-free Node bundler |
| Motion Accent | Locked Anime.js dependency and Node bundler |
| Tunnel / Signal | Dependency-free Node bundler |
| Oxide Header Lab | Explicit HTML, CSS, JS, and analysis allowlist |
| Clip Path | Standalone HTML, with opt-in procedural Web Audio |
| Styling notes | Complete canonical Markdown rendered to static HTML, plus raw Markdown companions |
| OPML utility | README only; command-line programs are never executed by deployment |

Scanground was removed from the collection and build on 16 October 2026 at the user's request. Its tracked application source is removed; any previously ignored local files remain ignored under `/scanground/`. No React/Vite dependency install remains in this publication workflow.

## Readable study notes

Every experiment has a **Styling notes** link next to its inspiration links. `scripts/build-notes.mjs` maps canonical analyses to ignored `notes/<slug>.html` and byte-identical `notes/<slug>.md`. The Pages builder copies these explicit files under `_site/notes/`. The collection cover's comparative Neuromancer/Hermes study has its own notes page in addition to Signal Press's implementation analysis.

The dependency-free Markdown renderer escapes raw HTML, rejects unsafe links, converts remote Markdown images into ordinary source links, and produces semantic headings, code, lists, tables, quotes, and emphasis. It renders the whole study rather than a summary. Known cross-study links resolve locally; repository links resolve to GitHub; private notebook references stay readable without producing dead local routes. The reading layout is centered and width-constrained, with system fonts, no runtime fetch, and automatic light/dark colors. Raw Markdown remains available for reuse by a person or LLM.

## Build and deployment

Use Node 22.12+ and npm. Install only Motion Accent's locked dependency with `npm ci --ignore-scripts --prefix motion-accent-lab`, then run `node scripts/build-pages.mjs`. `node scripts/preview-pages.mjs` previews the completed output at <http://127.0.0.1:8765/artifacts/> with ordinary static-host 404 behavior. Relative links work under the repository prefix and in the local tree after building.

`.github/workflows/pages.yml` checks out LFS content, installs the locked dependency, runs mechanics and Markdown tests, and builds the allowlisted output. Pull requests validate without publishing. Pushes to `main` and manual runs on `main` upload the artifact; the dependent deploy job alone receives `pages: write` and `id-token: write`. The `github-pages` environment and branch filters must match the default branch. No custom deployment secret or backend is needed.

The preview and build checks verify static routing and publication boundaries. They do not replace browser interaction checks, cross-browser testing, external-source availability checks, listening tests, or performance benchmarks. Existing project analyses record their actual verification and limits; historical statements in those analyses describe their dated milestone rather than the current deployment. Check the current Actions deploy job to confirm publication succeeded.

## Assets, source history, and privacy

Git history was reset to a clean source snapshot on 10 October 2026. Historical revision links in older analyses may no longer resolve; the source URLs and dated observations remain useful evidence. Collection dates are preserved in [the catalog](artifact-catalog.md), including explicitly approximate older import dates.

Intentional binary assets use Git LFS. The workflow materializes those objects before copying publication files; it does not upload LFS pointers as media. Soundscape's canonical Foley WAV remains the intentional binary audio asset, with the upstream MIT notice and exact source hashes retained. Clip Path's new sounds are procedural synthesis, so its standalone HTML needs no duplicate audio asset. Signal Press's SVG is original text-based artwork; no reference-site images, fonts, implementation code, or logos are copied.

Dependencies, generated output, caches, screenshots, local photographs, downloaded feeds, secrets, and machine configuration stay excluded. Raw notes intentionally preserve their complete authored Markdown; no private notebook content is fetched for publication. AGENTS.md requires review of size, privacy, copyright, and provenance before committing. The root ignore rules retain the [GitHub template](https://github.com/github/gitignore) baseline and now cover generated readable notes and the retired local experiment.
