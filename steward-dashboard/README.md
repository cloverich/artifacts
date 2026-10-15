# Steward

A fictional dashboard for an autonomous daily engineering routine. The dashboard is both a manager's view and the agents' shared working memory: **Where things stand** contains durable context and next steps; **What happened** records completed runs.

## Open

```sh
node steward-dashboard/build.mjs
```

Open [dist/steward.html](dist/steward.html) in a modern browser. The generated file is self-contained, roughly 42 KiB, and needs no installation or backend. For an optional local preview:

```sh
node steward-dashboard/preview.mjs
```

Visit <http://127.0.0.1:8791/steward.html>. Stop with Ctrl+C. The preview binds only to localhost and serves an explicit list of public project files.

## Explore

- Four metric cards with 7/30-day totals, a 180-day activity heatmap, and a 90-day vulnerability burndown ending at six open findings.
- Three collapsed state handoffs: Dependency tracker, Vulnerability tracker, and Rails 7 migration. Expand to read current context, next steps, and related work.
- Fifteen collapsed run records. Filter by agent, expand a summary, or follow a mock PR/commit/Jira link into a fictional work-item preview.

The dates are fixed at 15 October 2026. All workspace names, runs, findings, PRs, commit hashes, and tickets are invented. No real workplace material is included. Expansion/filter state resets on reload. This prototype includes no scheduler, persistent storage, or integrations.

## Source and provenance

`index.html` holds the layout and current-state prose; `style.css` holds the visual system; `app.js` holds deterministic fixtures, chart rendering, run history, filtering, and mock-link previews. `build.mjs` inlines the CSS and JavaScript with Node built-ins. There are no package dependencies, remote fonts, downloaded media, analytics, polling, or animation loops.

Visual inspiration: [Prime Intellect](https://www.primeintellect.ai/) and [Plastic Labs](https://plasticlabs.ai/), inspected 15 October 2026. The fine borders, monospaced annotations, squared surfaces, and restrained green accents inform an original dashboard; no site code, fonts, logos, or images were copied. The Steward mark and chart geometry are original SVG/HTML. This is not a reconstruction or performance comparison of those sites.

[Design study and verification](analysis.md). Engram note: `03h1zwtiovhw4repexouvwg44`.

## Verification

Verified the bundled HTML over localhost in a browser at desktop width and at 390/320 px: collapsed defaults, three expandable state sections, all fifteen expandable run entries, a five-run agent filter, fictional-link dialog, and no horizontal overflow in the checked layouts. Inspected desktop and expanded mobile screenshots. Node syntax and standalone bundle checks also passed. The whole collection build validates its local links and assets.

The browser tool rejects `file://` navigation, so direct-file execution was not browser-tested. The standalone file contains all runtime code and assets and makes no network requests in its source. No cross-browser, screen-reader, or formal performance audit was performed.

Generated `dist/` output and local `qa/` screenshots are ignored. The ignore rules were reviewed against GitHub's Node template; only original source and documentation are committed.
