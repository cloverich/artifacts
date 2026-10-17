# Horizon Plate

A footer lab. The page runs straight into the footer, and the footer's sky is the page: a landscape reduced to one ink (engraving, halftone, Bayer, error diffusion, mezzotint, scanline, or ASCII) that dissolves dot by dot at the top. Built to align on a treatment before adding footers to xylo and pinecoder.dev.

Inspired by three supplied footer screenshots (a "Finance" footer, a "Nova Labs" footer, and GLAUX by [@AdityaSur11](https://x.com/AdityaSur11) on X). No affiliation; no reference images are copied. The sample landscapes are procedural.

## Run

```sh
node horizon-plate/build.mjs        # → horizon-plate/dist/horizon-plate.html (open from disk)
node --test horizon-plate/mechanics.test.mjs
```

Drop, paste, or choose your own image; it is processed in the browser and never uploaded. **Export PNG** renders the plate at the chosen width and saves a mask; **Copy CSS** gives the matching footer rule.

## Source

- `mechanics.mjs`: DOM-free pipeline (procedural scenes, tone, seven mark algorithms, indexed PNG encoder). Runs unchanged in Node, so the same code can render plates at build time.
- `app.js`: lab UI, theme presets, preview, export.
- `index.html`, `style.css`: page and styles. `build.mjs` inlines everything plus `analysis.md`, and also writes `dist/artifact.html`, a head-less fragment for publishing as a Claude artifact.
- `analysis.md`: the study: what the references do, the pipeline, performance rules, alternatives, measured file sizes, and open questions.

## Verification

Tested in headless Chromium 1194 at 1280 px and 390 px, light and dark, 1× and 2×: every preset renders with no console errors and no horizontal overflow; export downloads decode as indexed PNGs with transparency at the expected sizes. `image-rendering: pixelated` on `mask-image` was verified in Chromium only. Safari and Firefox are untested.

## Assets and provenance

All code, copy, and imagery are original. The scenes are generated from seeded value noise. No binary assets are committed; `dist/` is ignored by the root `.gitignore`.
