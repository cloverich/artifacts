# Horizon Plate: footers that dissolve into a landscape

Study date: 17 Oct 2026; revised the same day after first use, and again on 18 Oct 2026 (position model, fewer treatments, finer marks, tabbed lab). Evidence: three footer screenshots supplied by the user (a "Finance" footer with a galloping horse, a "Nova Labs" footer with camels under a moon, and a "GLAUX" footer posted by @AdityaSur11 on X). No live pages or source were inspected; everything below about the references is read from the images and labelled as observation or inference.

## What the references do

Observed in all three:

- **The footer has no background of its own.** The page colour continues into the footer, and the image's sky *is* that colour. There is no visible top edge, card, or gradient band. The content above simply runs into open sky.
- **Text sits on the sky.** Brand, blurb, link columns, and a hairline-ruled legal row occupy the top 40–50% of the plate, where the image is emptiest.
- **The image is a print, not a photo.** Each one is reduced to one or two inks with a visible mark: grain, dither, or engraved line. That mark is what lets a photographic subject share a page with flat UI colour.
- **Weight is at the bottom.** Horizon around 60–70% down, the subject on or near it, ground filling the bottom edge.

Per reference:

| Reference | Ground | Ink | Mark (inferred) | Polarity |
| --- | --- | --- | --- | --- |
| Finance | warm grey | soft black | stochastic grain over continuous tone; reads as mezzotint or heavy film grain | ink the shadows |
| Nova Labs | ultramarine | sand / ochre, plus blue texture in the sand | fine dither or noise texture over a two-colour separation | ink the light |
| GLAUX | cream | cobalt | line engraving / toile illustration (likely drawn or AI-generated, not processed from a photo) | ink the shadows |

Inference: the GLAUX plate is an illustration in an engraved style rather than a processed photograph; cross-hatched trees and stone courses are drawn, not thresholded. A threshold pipeline approximates the *material* but will not invent hatching that follows form. See "Lines that follow form" below.

## The mechanism, as built here

The lab renders an **alpha mask**, not an image, and paints ink through it with CSS.

1. **Crop + luminance.** Cover-fit the source into the plate frame (fixed CSS width × height, per-plate zoom and position) at the algorithm's scale (the dither samples straight onto its dot grid), then Rec. 709 luminance.
2. **Tone → ink amount.** Auto-levels on the 0.5/99.5 percentiles; contrast about mid-grey; polarity (`ink the shadows` = 1 − L, `ink the light` = L); an **ink floor** (values below it become exactly zero so the sky is clean page colour); gamma; and a **dissolve**: ink is multiplied by a smoothstep ramp over the top N% of rows. Because the ramp scales *ink* rather than opacity, a dither dissolves dot by dot and an engraving thins line by line, which is how the references meet the page.
3. **Marks.**
   - *Engrave*: ink where `|fract(u/s) − ½|·2 < tone·0.82`, edge antialiased over ~1px. `u = y` (flat), `y + A·Σsin(kx)` (guilloché), or `y − R·blur(ink)` (relief: lines bow over bright/dark masses). Optional second family at ~60° for deep tones. Ported from xylo's EngravingLab.
   - *Halftone*: Euclidean spot `½(cos u + cos v)` on a rotated lattice, threshold `1 − 2·tone`. Dots touch at 50% and invert into holes.
   - *Diffuse*: Floyd–Steinberg (serpentine, full error) or Atkinson (6/8 of error: drops faint dots, crushes shadows, so skies go cleaner and shapes read more graphic).
   - *Scanline*: fixed-width rows; tone sets row intensity, not width. Requires grey levels.
   - *Ink map*: no marks; the tone curve itself as continuous coverage. Shipped at half resolution.

   Dropped after first use: Bayer (ordered 8×8 threshold; the crosshatch read as dated), mezzotint (white-noise threshold; Floyd–Steinberg at a fine dot gives a similar grain with less noise), and ASCII (glyph cells; worth its own study rather than a footer option). Mark sizes now run down to 0.5–1 CSS px: on first use every treatment looked best at the old minimum, so the ranges moved down to one device pixel on a 2× screen.
4. **Quantize + encode.** Coverage → 2, 4, 16, or 256 levels (continuous output can dither between levels) → **indexed PNG** written in the page (CRC32 + `CompressionStream('deflate')`). Every palette entry is the ink colour; `tRNS` carries the coverage ramp. One file is therefore both a CSS alpha mask and a ready-to-use pre-inked `<img>`.
5. **Ink.** `background: var(--ink)` through `mask-image`. Theme switches recolour without re-rendering. Polarity cannot be switched by CSS: a light theme and a dark theme that both want "photographic positive" need two masks (or one mask and an inverted source).

## Why this is fast to load and to scroll

- **No runtime work on the shipped page.** The plate is a static mask; no script, canvas, or WebGL context.
- **Small files by construction.** 1-bit indexed PNGs of line art compress well. Dithers are high-entropy, so they are shipped at the **dot grid** (one PNG pixel per dot) and scaled up with `image-rendering: pixelated`. A 2-px dither is a quarter of the pixels of the displayed plate. Verified in Chromium 1194 (headless): `image-rendering: pixelated` applies to `mask-image` (hard 0→255 edge at the cell boundary vs. a 160→112 ramp with `auto`). Safari and Firefox were not tested.
- **Scroll cost is compositing only.** A static masked element rasterises once. Avoid `background-attachment: fixed`, scroll-linked parallax, `filter` / `backdrop-filter` on or over the plate; each forces repaints.
- **Below the fold.** `content-visibility: auto` with `contain-intrinsic-size` keeps the footer out of first render. The mask is fetched only when used. (CSS `mask-image` cannot be `loading="lazy"`; if that matters, use an `<img>` pre-inked with the palette.)

Readouts in the lab report crop, tone, mark, paint, and encode times and the exact PNG size per state. The lab itself previews into a canvas in the ink colour (the same level indices the PNG stores), encodes only once the controls go still, drafts lines and screens at 1× while a slider is held, and draws only the active tab. Those numbers are from the viewer's machine; nothing here claims a benchmark.

### Measured file sizes

Read from the lab in headless Chromium with the sample photographs (17 Oct 2026). Wide plate is 2400 CSS px wide.

| Plate | File | Size |
| --- | --- | --- |
| Dusk: Atkinson, 2 px dots, sunset, 2400×380 | 1200×190, 1-bit PNG | 8 KB |
| Toile: guilloché engraving, sunset, 2400×380 | 4800×760 (2×), 1-bit PNG | 44 KB |
| Mezzotint (since dropped), 1 px grain, sailboat, 2400×380 | 2400×380, 1-bit PNG | 79 KB |
| Scanline, sunset, 2400×380 (preview at 1×) | 2400×380, 16-level PNG | 23 KB |
| Ink map, sailboat, 2400×620 | 1200×310 (½×), 256-level PNG | 140 KB |
| same | lossy WebP (alpha is lossless) | 135 KB |
| same | 16 levels, ordered dither | 45 KB |
| same | 16 levels, no dither | 35 KB |
| Ink map, narrow plate 820×300 | 410×150, lossy WebP | 29 KB |

Conclusions:

- Grey levels cost more than resolution. A 1-bit plate at 2× beats the same plate at 2-bit, and on a 1× screen the browser's downscale restores antialiasing, so line and screen algorithms default to 1-bit.
- Dithers at 2 px dots are under 10 KB. Random grain (mezzotint) is the most expensive 1-bit mark.
- The continuous ink map is the expensive one. Shipping it at half resolution is free visually (soft tone upscales cleanly) and cuts pixels 4×. Sixteen levels without dither band visibly in soft cloud; with ordered dither the bands go but a faint screen shows in pale areas. WebP saves almost nothing because Chromium compresses its alpha plane losslessly, and Safari's canvas cannot encode WebP at all. Default: 8-bit PNG, about 140 KB for a 2400×620 plate, loaded below the fold.
- PNG row filters (min-sum-of-abs heuristic) are applied to 8-bit output; 1-bit and 2-bit palette art stays on filter 0, which compresses best for it.

## Crop, don't scale: two plates (responsive)

Dots must stay at a fixed CSS size or they beat against the device pixel grid (moiré, uneven dots). So each plate has a fixed CSS width and is clipped by the screen (`overflow: clip` on the footer, so the oversize pseudo-element never causes horizontal scroll). The Footer tab previews exactly that geometry; the Image tab shows the whole plate and brackets what 1280, 1440, and 1920 px screens (or 360–768 px phones) actually see, above the source photo with the plate's frame on it.

**Position, not crop.** The first version always centred the plate on screen and treated X/Y as a crop inside it. That fails for a subject near the edge: a 4:3 photo cover-fitted into a 2400×380 plate is width-limited, so at zoom 1 horizontal crop does nothing, and a sailboat at 89% of the photo sits at x ≈ 2140 of 2400, outside any 1920 px screen. Now X and Y work like CSS `object-position` at both levels: the photo inside the plate (`offset = (plate − photo) × X`) and the plate on the screen (`left: X%; transform: translateX(-X%)`, which is how `background-position` percentages behave). Composed, the photo's point at X% lands X% across every screen width, so whatever is at the edge of the photo stays at the same edge of every screen. Y 100% keeps the bottom of the photo, which is where a horizon usually is.

**Zooming out past cover.** Cover-fit is the right default for landscapes, but a portrait source (2:3) in a 2400×380 plate shows about a tenth of its height. Zoom now runs down to 0.2×: below 1× the photo no longer fills the plate, the uncovered area carries no ink (it is page), auto-levels are measured inside the photo only, the top dissolve starts at the photo's top edge, and **Dissolve sides** ramps its left and right edges by the same smoothstep, so a narrow photo floats in the footer instead of ending in a hard edge. Plate height now runs to 1000 px.

One plate cannot serve both a phone and a desktop: a 2400 px plate on a 390 px phone shows a sliver. The lab therefore makes two, each with its own width, height, text overlap, position, and zoom, sharing the algorithm and tone so they read as one print:

- **Narrow** (600 / 820 / 1024 px wide), used below its own width.
- **Wide** (1600 / 2400 / 3200 px), used from there up.

The exported CSS is mobile first: the base rule masks with `plate-narrow`, and one `min-width` media query swaps `mask-image` to `plate-wide`. Browsers fetch images only for the declarations that apply, so each visitor downloads one plate; a resize across the breakpoint fetches the other. Text overlap is a footer `padding-bottom` of `height × (1 − overlap)`, set per plate, with `min-height` equal to the plate height so the clip never trims its top.

**Masks load in CORS mode.** Verified in Chromium: the exported CSS paints nothing when the page is opened from `file://` (an opaque origin), and paints correctly from a local HTTP server. Serve plates from the same origin, or from a CDN that sends `Access-Control-Allow-Origin`. The lab itself is unaffected because its preview masks are `blob:` URLs.

## Alternatives

- **Pre-inked `<img>` instead of a mask.** The same PNG works as an image (palette = ink). Gains `loading="lazy"`, `decoding="async"`, `fetchpriority="low"`, and alt handling; loses CSS recolouring. Per-theme colour then needs one file per ink.
- **Build-time rendering (Node, Go).** Same algorithms, run in CI from source photos; output committed or cached. Right for Hugo (blog2) and Astro (xylo) since plates are known in advance. The lab's `mechanics.mjs` is DOM-free and can run under Node unchanged, except image decoding (needs `sharp` or a Go decoder).
- **Live WebGL shader.** Sharp at any size, animatable, no asset. Costs a GL context and per-frame GPU work while visible; overkill for a static footer.
- **SVG filters** (`feTurbulence` + `feComponentTransfer` + `feDisplacementMap`). No asset, but poor control over mark shape and expensive to paint on large areas.
- **AI/illustrated plates (GLAUX).** Highest fidelity, hatching follows form. Not reproducible from a photo pipeline; needs sourcing and licensing per image.

## Lines that follow form (not built yet)

Real engraving bends `u` along image structure. A practical next step: structure tensor (Sobel gradients, Gaussian-smoothed) → orientation field → integrate streamlines or solve for a phase field `u` whose level sets follow it. Ostromoukhov, *Digital Facial Engraving* (SIGGRAPH 1999) is the reference. The `relief` field here is a cheap approximation: lines displaced by blurred tone.

## Uncertainties

- The reference implementations are unknown; they may be static images with baked colour, not masks.
- The Nova Labs plate shows blue texture inside the sand, which suggests either a two-colour dither (ink and page) or a texture overlay. The lab models one ink over the page colour.
- Browser coverage of `image-rendering` on masks outside Chromium is unverified.
- Whether `content-visibility: auto` on the footer defers the mask fetch was not measured.

## Sample photographs

Three real photographs taken by a person (not generated), supplied by the photographer, who gives permission to use them however you like. Re-encoded at 1600 px wide with metadata stripped; stored in `photos/` via Git LFS and inlined into the built page.

- `sailboat.jpg`: a sailboat under low cloud in the Salish Sea, Washington, on the way to Orcas Island. iPhone.
- `sunset.jpg`: sunset over Lake Washington, Washington, with a mountain range silhouetted on the horizon. Mirrorless camera (OM System OM-5 or Sony; unconfirmed).
- `forest.jpg`: fog on a disc golf course in Washington; the same photo is used in xylo's image lab. iPhone.

## Sources

- User-supplied screenshots (Finance footer, Nova Labs footer, GLAUX footer by @AdityaSur11 on X, Oct 9).
- xylo: `src/pages/media/engraving.mdx`, `src/components/specimens/EngravingLab.tsx` (line-field threshold, alpha-mask output).
- PNG specification (W3C, third edition): indexed colour, `tRNS`, bit depths 1/2/4/8.
- Compression Streams (WHATWG): `deflate` emits a zlib stream, which PNG `IDAT` requires.
- Floyd & Steinberg (1976); Bill Atkinson's dither (MacPaint); Bayer (1973).
- Ostromoukhov, V. *Digital Facial Engraving*, SIGGRAPH 1999.

Engram: not posted; no Engram tools were available in this session. This file is the local draft.
