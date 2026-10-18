# Horizon Plate

A footer lab. The page runs straight into the footer, and the footer's sky is the page: a landscape reduced to one ink (engraving, halftone, error diffusion, scanline, or plain continuous tone) that dissolves dot by dot at the top. Built to align on a treatment before adding footers to xylo and pinecoder.dev.

Inspired by three supplied footer screenshots (a "Finance" footer, a "Nova Labs" footer, and GLAUX by [@AdityaSur11](https://x.com/AdityaSur11) on X). No affiliation; no reference images are copied.

## Run

```sh
node horizon-plate/build.mjs        # → horizon-plate/dist/horizon-plate.html (open from disk)
node --test horizon-plate/mechanics.test.mjs
```

Start from a sample photo or drop, paste, or choose your own; it is processed in the browser and never uploaded. Tabs switch between **Footer** (the shipped geometry), **Image** (the whole plate, the slice each screen width shows, and the source photo with the plate's frame), and **Notes**; Hide controls gives the preview the full width. Tune a **wide** and a **narrow** plate (each with its own width, height, text overlap, position, and zoom). Position works like CSS `object-position`: the photo's point at X% sits X% across every screen. Zoom below 1× fits a portrait or narrow photo inside the plate, with **Dissolve sides** fading its edges into the page. **Export PNG** saves `plate-wide.png` or `plate-narrow.png` exactly as previewed; **Copy CSS** gives the mobile-first footer rule that loads one or the other. **Copy recipe** copies every setting as JSON; paste it on the page to restore them, or hand it to a build with the source photo to re-render the same plates (text survives chat and commits; a 1-bit PNG pasted into chat does not).

## Source

- `mechanics.mjs`: DOM-free pipeline (tone, four mark algorithms, quantize with optional dither, indexed PNG encoder with row filters). Runs unchanged in Node, so the same code can render plates at build time.
- `photos/`: the three sample photographs (Git LFS), inlined into the build as data URIs.
- `app.js`: lab UI, theme presets, tabbed preview (canvas in the ink colour; the PNG is encoded only once controls go still), export.
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
