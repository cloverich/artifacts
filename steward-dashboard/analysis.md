---
tags:
  - artifacts
  - interface-design
  - autonomous-agents
  - dashboards
  - provenance
---
# Steward: a dashboard as shared working memory

Design inspection: 2026-10-15. The user wants an original public-safe mockup of their described routine: autonomous security fixes, dependency maintenance, and a Rails migration, inspected through one dashboard. All repository names, tickets, pull requests, dates, and execution records in the artifact will be fictional.

## Reference evidence
- [Prime Intellect](https://www.primeintellect.ai/) and its [blog](https://www.primeintellect.ai/blog): observed in this conversation's browser inspection. Dark backgrounds; compact monospaced navigation; squared controls; a distinct futuristic wordmark; fine borders; technical diagrams mixed with editorial content.
- [Plastic Labs](https://plasticlabs.ai/): observed in this conversation's browser inspection. Black/charcoal background; thin structural grid; pixel lettering; ASCII fields; terminal-like section markers.
- These are visual observations, not claims about their implementation. No original scripts, fonts, logos, imagery, or CSS are copied. Their performance was not measured; the user's report of performance issues is not presented as benchmark evidence.

## Transferable idioms
A sparse grid and quiet hairline rules can convey a technical control surface without a canvas, shader, animated background, or downloaded font. Use typography, restrained phosphor-green accents, column alignment, and original SVG chart geometry. The density serves routine inspection instead of marketing.

The four sections are intentionally distinct:
1. Tight header: identity and last update.
2. Aggregate metrics: runs, outstanding PRs, commits and vulnerability fixes, plus activity heatmap and 90-day vulnerability burndown.
3. Where things stand: collapsed current-state records for Dependency tracker, Vulnerability tracker, Rails 7 migration. Each expands to a short handoff and linked work.
4. What happened: fifteen collapsed run records with agent, date, duration, occasional ticket references, and modest expanded summaries.

Current state is durable working context; run log is chronological evidence. Native details/summary gives each record its own accessible expand/collapse interaction. Mock work links will open an in-page detail panel explicitly labeled fictional rather than navigate to real organizations or dead external URLs.

## Representation and cost
Use a deterministic local daily fixture for 180 days, with a findings ledger for the final 90 days. Derive 7/30-day metrics and the heatmap from the same records; derive open-vulnerability totals and burndown from a consistent ledger. Render charts as static inline SVG and ordinary HTML. No timer, polling, data backend, network requests, or animation loop is necessary. Browser-native disclosure is usable without JavaScript; JS enhances fixture rendering, chart inspection, and mock link previews.

A chart library would provide sophisticated axes and interactions but adds dependencies for two small static plots. Canvas can handle much larger cell counts, but SVG/HTML makes this small dataset inspectable and accessible. These are architectural choices, not measured speed claims.

## Intended artifact
Local project: /Users/cloverich/code/artifacts/steward-dashboard.
Keep source HTML/CSS/JS readable and bundle a standalone ignored dist/steward.html with Node built-ins. README records run/build instructions, provenance, and actual verification. This is a dashboard prototype, not a reconstruction or performance audit of either inspiration site. No actual scheduler or integrations are included.

## Implemented mechanics

The current-state sections are native HTML details/summary elements containing two paragraphs and related work. Each handoff separates current context from the next run's action; Rails work contains a concrete maintainer decision so the dashboard explains why an agent stops or continues. This demonstrates the user's workflow without adding a separate mechanics overlay to the product.

The activity ledger contains 180 deterministic daily records. Seven- and thirty-day cards sum those same records; the heatmap lays out Monday-first weeks as a CSS grid. The 90-day findings ledger satisfies 78 initial findings + 17 discovered - 89 fixed = 6 open. SVG maps each day to an x coordinate and remaining findings to a y coordinate, draws a static path with a quiet area fill, and marks the target at zero. Its almost-linear trend is illustrative rather than an empirical forecast.

Fifteen sample executions are sorted by completion time, five per agent. The collapsed rows display agent, start time, duration, and optional ticket. The filter hides nonmatching native details and updates the visible count. Work-item links resolve to an original in-memory fixture and open a native dialog labeled fictional. There are six outstanding PRs: two awaiting review and four in CI. Current-state records and historical runs are separate representations: the history is a selected recent window, not the full aggregate ledger.

CSS uses system fonts, squared surfaces, thin rules, and restrained green/amber cues. Layout changes from four metric columns and two charts to two metric columns and stacked charts. State and run bodies become single-column on narrow screens. There is no ambient animation; only a short hover transition when reduced motion is not requested. Native controls provide disclosure, select filtering, and dialog closure without a framework. Dynamic HTML interpolates only authored fixtures; an eventual integration should use text nodes for untrusted remote content.

Alternatives: real work links could simply leave the dashboard; mock previews make this prototype reviewable offline. A live implementation might store versioned current-state handoffs separately from append-only executions and derive aggregates from execution events. That storage architecture is not implemented here. Native disclosures avoid a custom interaction runtime; a full data grid would become useful only with substantially more sorting, filtering, or rows.

## Build, privacy, and verification

Project: `steward-dashboard/`. Build with `node steward-dashboard/build.mjs`; open `steward-dashboard/dist/steward.html`. Optional HTTP preview: `node steward-dashboard/preview.mjs`, then `http://127.0.0.1:8791/steward.html`. Node built-ins only; no install required. Source entry points are `index.html`, `style.css`, and `app.js`. The collection index and curated Pages builder include the artifact; nothing was pushed or published.

Verified 2026-10-15:
- Node syntax checks for application, builder, preview server, and collection builder.
- Bundled HTML: 43,212 bytes (42.2 KiB), one valid inline script, inline CSS, no external runtime links, and no application fetch/polling/animation loop.
- Browser over localhost: three state disclosures and fifteen run disclosures default closed; all expand successfully; Rails filter shows five runs; all-agent filter restores fifteen; fictional ticket preview opens and closes; reload returns to collapsed defaults.
- Desktop screenshot inspected at 1280 px; mobile screenshot inspected at 390 px with Rails expanded. Layout checks at 390 and 320 px found no horizontal overflow.
- Whole collection build passed, including local links/assets validation: 14 curated files, 2605.4 KiB. Scanground emitted existing browser-database-age warnings; its build completed.
- Direct-file browser navigation was attempted and rejected by the browser tool's file-protocol policy. Localhost verification does not establish direct-file execution. Static inspection confirms the standalone file embeds its runtime resources.
- No formal performance benchmark, cross-browser matrix, keyboard-only audit, or screen-reader audit was performed.

All mock workspace data and the pixel S mark are original. No workplace examples, copyrighted sample media, site implementation code, logos, or downloaded fonts were used. Project ignores cover generated bundles, QA captures, and local diagnostics; root ignores already cover dependencies and secrets. Ignore review used [GitHub's Node template](https://github.com/github/gitignore/blob/main/Node.gitignore). Only source, provenance, and build configuration belong in the commit.


Engram note: `03h1zwtiovhw4repexouvwg44`.
