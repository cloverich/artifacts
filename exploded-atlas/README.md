# Exploded Atlas

An original interactive study of the two supplied Archmaster diagrams: their shared editorial grammar, the difference between thematic and assembly explosion, annotation budgets, and the open tools/data needed for a practical version.

Open the generated `dist/exploded-atlas.html` directly in a browser. It contains its own SVG renderer, CSS, JavaScript, and full research; no runtime network access is required. Controls switch landscape/pavilion, separation, annotation budget, material/semantic/mesh views, registration guides, cutaway, selected layer records, and real SVG export.

Build with Node (no install step or dependencies):

```sh
node build.mjs
node --test mechanics.test.mjs
```

Run those commands from this directory. `index.html`, `style.css`, and `app.js` are the source UI; `mechanics.mjs` holds projection, terrain sampling, explosion, and label layout; `build.mjs` packages the standalone file. `analysis.md` contains the source-backed research and evidence limits.

All terrain and pavilion geometry is synthetic/original. Terrain water lines are authored, not drainage analysis. No GIS/IFC import, survey dimensions, structural validation, arbitrary camera or photorealistic renderer is implemented. The references' actual production tools remain unknown; the product identity is not resolved by the screenshots. This is a mechanics study, not a reconstruction of either site.

Engram note: `03h0vzv2wv6rxdabd9pibfuho`, **Exploded atlases: visual grammar, open tools, and practical evidence**, journal `engram`.

## Verification

Three focused Node tests pass: registration/assembly elevation, bounded non-overlapping label layout, and terrain triangle orientation. Build-time script syntax and runtime asset checks pass. Browser checks through a temporary HTTP preview exercised both modes, separation endpoints, all annotation budgets and representations, guides, profiles/cutaways, selected records, and a real SVG export (parsed as XML). Desktop and 375/320 px layouts were inspected; only the intentional diagram region scrolls horizontally. No warning/error browser logs were observed.

The browser tool blocks `file://`, so direct-file execution was not verified. The generated file is fully bundled; the HTTP preview tests the same file, not a different dev application. Ignore rules were reviewed against GitHub's Node template and the root baseline. Generated bundles, QA captures, and temporary research are excluded; sources and original geometry are intentional.

Historical implementation (revision retired by the collection history reset): `a0ac242cce722e89391b0aa179424a28ee7305e0`. Older Engram code links target that retired revision; current source is in this checkout.
