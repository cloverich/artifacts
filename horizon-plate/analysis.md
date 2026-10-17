# Horizon Plate: footers that dissolve into a landscape

Study date: 17 Oct 2026. Evidence: three footer screenshots supplied by the user (a "Finance" footer with a galloping horse, a "Nova Labs" footer with camels under a moon, and a "GLAUX" footer posted by @AdityaSur11 on X). No live pages or source were inspected; everything below about the references is read from the images and labelled as observation or inference.

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

1. **Luminance.** Draw the source to the plate's device-pixel size (cover-crop, vertical anchor), then Rec. 709 luminance.
2. **Tone → ink amount.** Auto-levels on the 0.5/99.5 percentiles; contrast about mid-grey; polarity (`ink the shadows` = 1 − L, `ink the light` = L); an **ink floor** (values below it become exactly zero so the sky is clean page colour); gamma; and a **dissolve**: ink is multiplied by a smoothstep ramp over the top N% of rows. Because the ramp scales *ink* rather than opacity, a dither dissolves dot by dot and an engraving thins line by line, which is how the references meet the page.
3. **Marks.**
   - *Engrave*: ink where `|fract(u/s) − ½|·2 < tone·0.82`, edge antialiased over ~1px. `u = y` (flat), `y + A·Σsin(kx)` (guilloché), or `y − R·blur(ink)` (relief: lines bow over bright/dark masses). Optional second family at ~60° for deep tones. Ported from xylo's EngravingLab.
   - *Halftone*: Euclidean spot `½(cos u + cos v)` on a rotated lattice, threshold `1 − 2·tone`. Dots touch at 50% and invert into holes.
   - *Bayer*: 8×8 ordered threshold on the dot grid.
   - *Diffuse*: Floyd–Steinberg (serpentine, full error) or Atkinson (6/8 of error: drops faint dots, crushes shadows, so skies go cleaner and shapes read more graphic).
   - *Mezzotint*: threshold against white noise per dot. Closest to the Finance grain at 1 bit.
   - *Scanline*: fixed-width rows; tone sets row intensity, not width. Requires grey levels.
   - *ASCII*: cell average picks a glyph from ` .,:;-=+*#%@`; glyphs are rasterised to the mask.
4. **Quantize + encode.** Coverage → 2, 4, 16, or 256 levels → **indexed PNG** written in the page (CRC32 + `CompressionStream('deflate')`). Every palette entry is the ink colour; `tRNS` carries the coverage ramp. One file is therefore both a CSS alpha mask and a ready-to-use pre-inked `<img>`.
5. **Ink.** `background: var(--ink)` through `mask-image`. Theme switches recolour without re-rendering. Polarity cannot be switched by CSS: a light theme and a dark theme that both want "photographic positive" need two masks (or one mask and an inverted source).

## Why this is fast to load and to scroll

- **No runtime work on the shipped page.** The plate is a static mask; no script, canvas, or WebGL context.
- **Small files by construction.** 1-bit indexed PNGs of line art compress well. Dithers are high-entropy, so they are shipped at the **dot grid** (one PNG pixel per dot) and scaled up with `image-rendering: pixelated`. A 2-px dither is a quarter of the pixels of the displayed plate. Verified in Chromium 1194 (headless): `image-rendering: pixelated` applies to `mask-image` (hard 0→255 edge at the cell boundary vs. a 160→112 ramp with `auto`). Safari and Firefox were not tested.
- **Scroll cost is compositing only.** A static masked element rasterises once. Avoid `background-attachment: fixed`, scroll-linked parallax, `filter` / `backdrop-filter` on or over the plate; each forces repaints.
- **Below the fold.** `content-visibility: auto` with `contain-intrinsic-size` keeps the footer out of first render. The mask is fetched only when used. (CSS `mask-image` cannot be `loading="lazy"`; if that matters, use an `<img>` pre-inked with the palette.)

Readouts in the lab report crop, tone, mark, and encode times and the exact PNG size per state. Those numbers are from the viewer's machine; nothing here claims a benchmark.

### Measured file sizes

A 2400 × 380 CSS px plate of the procedural "hills" scene, encoded by `mechanics.mjs` in Node 22 (17 Oct 2026). Procedural scenes are smoother than photographs, so treat these as lower bounds; a real photo can be 2–4× larger. In Chromium, the "dunes" plate exported at 2× and 2-bit came out at 220 KB.

| Plate | 1-bit | 2-bit | 4-bit |
| --- | --- | --- | --- |
| Engrave, 2× (4800 × 760) | 56 KB | 128 KB | 313 KB |
| Engrave, 1× | 16 KB | 36 KB | 103 KB |
| Halftone, 2× | 19 KB | 47 KB | 159 KB |
| Scanline, 2× | 2 KB | 6 KB | 16 KB |

| Dither at its dot grid (1-bit) | 1 px dots | 2 px dots | 3 px dots |
| --- | --- | --- | --- |
| Atkinson | 24 KB | 7 KB | 3 KB |
| Floyd–Steinberg | 32 KB | 9 KB | 4 KB |
| Bayer | 4 KB | 2 KB | 1 KB |
| Mezzotint | 42 KB | 12 KB | 5 KB |

Conclusions: grey levels cost more than resolution. A 1-bit plate at 2× is 2–3× smaller than the same plate at 2-bit, and on a 1× screen the browser's downscale restores antialiasing anyway, so the lab defaults line and screen algorithms to 1-bit. Dithers at 2 px dots are under 15 KB. Structured noise (Bayer) compresses far better than random noise (mezzotint).

## Crop, don't scale (responsive)

Dither dots must stay at a fixed CSS size or they beat against the device pixel grid (moiré, uneven dots). The exported CSS therefore positions the mask at `50% 100%` with a fixed CSS size (e.g. 2400 px wide) and lets narrow screens crop the sides. Consequences: the subject should sit near the horizontal centre, and a phone sees only the middle ~400 px. If that loses the subject, ship a second, narrower plate behind a media query, or use `image-set()` per density. Line engravings tolerate scaling better (they are antialiased), so `mask-size: cover` is acceptable for them.

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
- Procedural scenes are stand-ins. Real photographs will want different tone defaults.

## Sources

- User-supplied screenshots (Finance footer, Nova Labs footer, GLAUX footer by @AdityaSur11 on X, Oct 9).
- xylo: `src/pages/media/engraving.mdx`, `src/components/specimens/EngravingLab.tsx` (line-field threshold, alpha-mask output).
- PNG specification (W3C, third edition): indexed colour, `tRNS`, bit depths 1/2/4/8.
- Compression Streams (WHATWG): `deflate` emits a zlib stream, which PNG `IDAT` requires.
- Floyd & Steinberg (1976); Bill Atkinson's dither (MacPaint); Bayer (1973).
- Ostromoukhov, V. *Digital Facial Engraving*, SIGGRAPH 1999.

Engram: not posted; no Engram tools were available in this session. This file is the local draft.
