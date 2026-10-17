# Horizon Plate

A footer lab. The page runs straight into the footer, and the footer's sky is the page: a landscape reduced to one ink (engraving, halftone, Bayer, error diffusion, mezzotint, scanline, or ASCII) that dissolves dot by dot at the top. Built to align on a treatment before adding footers to xylo and pinecoder.dev.

Inspired by three supplied footer screenshots (a "Finance" footer, a "Nova Labs" footer, and GLAUX by [@AdityaSur11](https://x.com/AdityaSur11) on X). No affiliation; no reference images are copied.

## Run

```sh
node horizon-plate/build.mjs        # → horizon-plate/dist/horizon-plate.html (open from disk)
node --test horizon-plate/mechanics.test.mjs
```

Start from a sample photo or drop, paste, or choose your own; it is processed in the browser and never uploaded. Tune a **wide** and a **narrow** plate (each with its own width, height, text overlap, crop, and zoom). **Export this plate** saves `plate-wide.png` or `plate-narrow.png` exactly as previewed; **Copy CSS** gives the mobile-first footer rule that loads one or the other.

## Source

- `mechanics.mjs`: DOM-free pipeline (tone, eight algorithms, quantize with optional dither, indexed PNG encoder with row filters). Runs unchanged in Node, so the same code can render plates at build time.
- `photos/`: the three sample photographs (Git LFS), inlined into the build as data URIs.
- `app.js`: lab UI, theme presets, preview, export.
- `index.html`, `style.css`: page and styles. `build.mjs` inlines everything, the photos, and `analysis.md`, and also writes `dist/artifact.html`, a head-less fragment for publishing as a Claude artifact.
- `analysis.md`: the study: what the references do, the pipeline, performance rules, alternatives, measured file sizes, and open questions.

## Verification

Tested in headless Chromium 1194 at 1280 px and 390 px, light and dark, 1× and 2×: every preset renders with no console errors and no horizontal overflow; both plates preview and export; downloads decode as indexed PNGs with transparency at the expected sizes. The exported CSS was tested in a plain page served over HTTP at 390 and 1440 px: each width fetches only its own plate and nothing scrolls sideways. From `file://` the masks do not paint, because mask images load in CORS mode. `image-rendering: pixelated` on `mask-image` was verified in Chromium only. Safari and Firefox are untested.

## Assets and provenance

All code and copy are original. The three sample photographs are real photographs taken by a person, supplied by the photographer, who gives permission to use them however you like:

- **Sailboat**: a sailboat under low cloud in the Salish Sea, Washington, on the way to Orcas Island. iPhone.
- **Sunset**: sunset over Lake Washington, Washington. Mirrorless camera (OM System OM-5 or Sony; unconfirmed).
- **Forest**: fog on a disc golf course, Washington; also used in xylo's image lab. iPhone.

They are re-encoded at 1600 px wide with metadata stripped (about 580 KB together) and tracked with Git LFS. `dist/` is ignored by the root `.gitignore`.
