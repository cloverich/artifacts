# Artifacts

A personal library of site styles, interfaces, motion, sound, and diagrams. Each experiment is usually a one-shot LLM study of a reference: break down its styling, then make an original example, often shaped by my prompts. The paired notes preserve the vocabulary, mechanics, evidence, and reusable recipes as the originals change or disappear. Each experiment lives in its own directory with a README explaining its intent and how to run it.

Open [index.html](index.html) to browse the collection. The index is plain HTML/CSS and needs no installation. Build the five bundled studies and readable styling notes before following their links in a fresh checkout. Browser artifacts and rendered notes are self-contained after building. The index links inspirations directly and identifies these independent studies as unaffiliated.

## Build and preview the collection

Use Node 22.12+ and npm:

```sh
npm ci --ignore-scripts --prefix motion-accent-lab
node scripts/build-pages.mjs
node scripts/preview-pages.mjs
```

Visit <http://127.0.0.1:8765/artifacts/>. The preview deliberately uses a repository subpath and returns real 404s, matching the routing constraints of GitHub Pages. Stop it with Ctrl+C.

The builder emits a curated `_site/` directory, checks local HTML links and assets, reports its size, and fails above the Pages size limit. It preserves the same relative links as the local index. It publishes the browser artifacts, every paired styling study, and the OPML utility's README. Soundscape embeds its MIT-attributed Foley audio sprite; its original ZIP and duplicate WAVs are excluded. It copies no dependencies, local photographs, downloaded feeds, credentials, or repository metadata. Generated output stays ignored.

Each **Styling notes** link opens centered, width-constrained HTML with automatic light/dark colors, real Markdown structure, and no runtime fetch or JavaScript. **Raw Markdown** gives the complete source for reuse by a person or LLM. The same generated pages live in ignored `notes/` locally and in `_site/notes/` for publication. Build only the notes with `node scripts/build-notes.mjs`. The dependency-free renderer deliberately supports the authored notes' headings, fenced code, tables, lists, quotes, links, and emphasis; raw HTML is escaped and remote images become source links. Existing analysis files remain the canonical source. Private Engram links render as text; repository source links resolve to GitHub, and cross-study links resolve to the readable notes.

To run the existing mechanics checks:

```sh
node --test exploded-atlas/mechanics.test.mjs motion-accent-lab/mechanics.test.mjs opentunnel-lab/timeline.test.mjs
node --test soundscape/*.test.mjs
node --test scripts/markdown.test.mjs clip_path/mechanics.test.mjs
node --check oxide-header-lab/app.js
```

## GitHub Pages

[Live collection](https://cloverich.github.io/artifacts/) · [GitHub repository](https://github.com/cloverich/artifacts)

[The workflow](.github/workflows/pages.yml) installs locked dependencies, runs the checks, builds the collection, and publishes `_site/` on pushes to `main`. Pull requests run the build and checks without deploying. Manual deployment is available from Actions on `main`.

The repository uses **Settings → Pages → Build and deployment → Source → GitHub Actions**. Push reviewed changes to `main` to update the live collection, or use the workflow's manual deployment button. Keep intentional lockfiles and assets; do not add ignored output or downloaded feeds. Check the workflow's deploy job to confirm publication succeeded.

Keep the workflow branch filters and `github-pages` environment deployment rules aligned if the default branch changes. The site requires no backend or custom deployment secrets; the deploy job uses GitHub's scoped token and OIDC permissions.

See [the hosting audit](docs/github-pages-audit.md) for artifact sizes, repository history, and remaining limitations.

## Adding an experiment

Place it in its own directory, add a short README, a substantive `analysis.md`, and index links for both the experiment and styling notes. Register its source/slug/experiment in `scripts/build-notes.mjs`, and explicitly add distributable files to `scripts/build-pages.mjs`. Add build/install/check steps if necessary. Review the root and project `.gitignore` against the relevant [GitHub template](https://github.com/github/gitignore); commit source, intentional assets, configuration, and lockfiles. `notes/`, `_site/`, dependency directories, and generated bundles stay ignored.

## Git LFS and provenance

Git history was reset to a clean source snapshot on 10 October 2026; the previous objects and archived history were purged. Existing research notes may refer to retired commit IDs; their source URLs and evidence remain in the project analyses.

Install [Git LFS](https://git-lfs.com/) before adding binary assets, then run `git lfs install --local` in each fresh clone. The committed `.gitattributes` routes common image, audio, video, document, model, and archive formats through LFS, including uppercase extensions; text and SVG stay in regular Git. Use `git lfs ls-files` to inspect tracked assets. These patterns do not automatically catch every large file: review size before committing and add a specific `git lfs track` rule when needed. LFS stores pointers in Git and content separately; it does not grant publication rights or replace ignore rules.

The Pages workflow checks out LFS content before building the curated `_site/`; never publish pointer files as media. LFS storage and transfer are subject to the GitHub account's quotas. Soundscape's intentional Foley sprite uses LFS; other current assets are text/SVG.

Before committing, review size, privacy, copyright, and provenance. Publish original media and explicitly authorized redistributable assets only; identify and link other third-party sample media instead of copying it into the hosted site. Record original-asset provenance and third-party sources/licenses in each project's README or analysis. Foley's generated exports retain the upstream MIT notice and per-source hashes in Soundscape.

Index entries record a short inspiration note and the date added. Dates marked `~` are inferred; see [the catalog evidence](docs/artifact-catalog.md). Preserve these dates on edits and record exact dates and source links for new entries.
