---
tags: [design-study, engraving, ascii, duotone, neuromancer, hermes]
---
# Neuromancer × Hermes: image as printed signal

Inspected **October 16, 2026**. Sources: [Neuromancer — Plastic Labs](https://plasticlabs.ai/neuromancer) and [Hermes Agent — Nous Research](https://hermes-agent.nousresearch.com/). Independent study, unaffiliated with either creator. Engram research note: `03h2988pkoi88188tc2t1o51t`.

This is a vocabulary and construction guide for a visual interpretation. The collection home borrows the restraint; [Signal Press](../signal-press/index.html) exposes the image layers. Neither reproduces the references' artwork or product claims.

## What to notice

Neuromancer's image feels etched rather than photographed: strands describe volume, dark gaps interrupt the face, and horizontal displacement reads as a damaged transmission. Its quiet monospaced layout and thin rules frame a dense image. A separate moving ASCII strip extends that image into the interface.

Hermes concentrates its identity in an ultramarine field. Pale, engraving-like figures belong to the same ink system as the type. Cream sections provide relief. Tall, condensed headings contrast with small technical labels. The strongest transferable idea is chromatic unity: illustration, background, and interface feel printed together.

These are browser observations. “Engraving” describes an appearance; it does not establish how the original images were made.

## Source evidence and its limits

| Observation | Established implementation | What remains unknown |
| --- | --- | --- |
| Neuromancer's etched portrait | An ordinary image from `/neuromancer/neuromancer_hero.png`, `object-fit: cover`, opacity `0.9` in the inspected page chunk | Original artist, image generator, and offline processing pipeline |
| Moving character separator | A separate `AsciiSeparator` component is passed `direction: vertical`, `duration: 25`, and `inverse: true` | Its complete generator was not traced; these props alone do not prove an algorithm |
| Hermes pale image on blue | `hero.webp` inside a `landing-hero-art` wrapper using `mix-blend-mode: lighten` | Whether the engraving treatment was drawn or processed offline |
| Repeated platform illustration | `platform-art.webp` with screen blending and opacity `0.4` | Authoring pipeline and source illustration licensing |
| Other Hermes image sections | Feature WebPs, a desktop preview video, isolated noise wrappers and CSS compositing | Runtime cost of each layer on a specific device |

Both pages expose Next.js assets and multiple font preloads. That identifies delivery choices, not a cause of slowness. The user's experience of slow performance motivates the local simplicity; no comparative performance benchmark was conducted.

The inspected Hermes CSS resolves primary color through `--hermes-color-blue`, with white/paper tokens for light layers. Its platform screen blend and hero lighten blend are distinct: do not describe all its artwork as one global filter. The local study uses explicit ink colors rather than copying its full compositor.

## Vocabulary to reuse

- **Contour hatching:** fine curved strokes follow the object's surface; their direction carries form.
- **Cross-hatching:** an intersecting stroke family deepens selected shadows.
- **Tonal density:** line spacing or stroke accumulation creates light and shade without smooth shading.
- **Duotone / limited ink:** map a subject into a ground and an ink, optionally a restrained second tone.
- **Chiaroscuro / reserved negative space:** preserve shadow masses instead of filling every area with texture.
- **Signal dropout:** remove or displace a few horizontal slices; maintain enough silhouette to read the subject.
- **ASCII density ramp:** order glyphs by apparent ink coverage, then map a sampled field into characters.
- **Chromatic infusion:** illustration and UI share a small family of related colors rather than adding unrelated accents.
- **Editorial counterpoint:** a dense specimen lives beside calm, readable type and generous empty space.

## A construction recipe

1. **Establish the silhouette.** Start with an original folded seed or vessel shape. It must remain recognizable before detail is added.
2. **Build the volume.** Draw curved contours around that shape. Increase density in shadowed folds, open it in the highlights, and vary spacing deliberately.
3. **Reserve the ground.** Do not engrave the whole rectangle. A few unmarked regions make dense areas legible.
4. **Choose the ink system.** Put pale strokes on an ultramarine field for a focused plate; use dark blue on paper for a quieter document.
5. **Add controlled interference.** A small number of interrupted bands and glyph fragments suggest transmission. Keep them away from body copy and controls.
6. **Separate layers.** Illustration is decorative; headings and actions remain ordinary HTML. A screen-reader should encounter the meaning without reading every glyph.
7. **Make the still frame work.** Default to a static print. Optional motion should expose a useful relation between layers, respect reduced motion, and stop when the page is hidden.

For an image-processing version, begin with luminance, apply a contrast curve, map that field into hatch density or a glyph ramp, then introduce sparse band displacement before compositing. This is a proposed reconstruction pipeline, **not an established description of either original**. A luminance-driven treatment requires a source image you may use; the local specimen instead uses original mathematical paths.

## Example prompt to adapt

> Create a compact editorial interface with an original contour-engraved specimen. Use concentrated ultramarine and warm ivory as a two-ink print. Let curved hatch density describe volume, preserve deep negative space, and introduce a few horizontal ASCII dropout bands. Keep headings and links crisp, ordinary HTML. Use a compact list, thin rules, quiet metadata, and an explicit source attribution. Support automatic light and dark themes with individually chosen colors. Provide a readable Markdown explanation of the visual decisions. Make the still frame complete; motion and sound must be optional. Do not copy third-party illustrations, logos, product text, or loading behavior.

Useful variations: swap ultramarine for amber to connect with Clip Path; remove the signal bands for a museum-catalog mood; keep the ASCII ramp while removing hatching for a terminal print; concentrate color in one small image while leaving the reading surface neutral, as the home page does.

## Local decisions and tradeoffs

The home remains a directly linked HTML catalog. Its only script changes the optional appearance selector; the default follows `prefers-color-scheme`. Its illustration is a small original SVG. No webfonts, framework, video, live pixel filter, or animation loop is required to read it. The artwork's blue plate stays intentional across both themes; text, focus outlines, rules, and metadata receive separate light/dark colors.

Signal Press provides the focused mechanism study rather than making the index into a playground. Its own [styling notes](../signal-press/analysis.md) document the approximation and controls. Clip Path retains its amber CRT identity, separate from the home page's theme.

| Method | Good fit | Tradeoff |
| --- | --- | --- |
| Static SVG contour paths | Small original artwork, crisp scaling, inspectable source | Path count grows with detail; not a general photo engraver |
| Pre-rendered raster image | Rich original illustration and complex texture | Needs licensed/owned source media and deliberate responsive delivery |
| Canvas 2D glyph grid | Many changing glyphs from a sampled field | Requires redraw scheduling and an accessible text alternative |
| WebGL per-pixel field | Dense interactive image processing | More machinery, GPU/context considerations, and fallback work |
| CSS opacity/transform | A few independent decorative layers | Does not actually synthesize new engraving detail |

These are suitability judgments, not benchmark results. The index chooses a small static surface because its job is navigation.

## Documentation as an artifact

Each catalog row puts **Styling notes** beside the inspiration links. A build-time renderer turns committed Markdown into centered HTML with a readable width, headings, code, tables, and automatic light/dark appearance. A raw Markdown companion is available for copying into a prompt or providing to an LLM. There is no runtime Markdown fetch, so generated notes also open directly from disk.

Build from the repository root with `node scripts/build-pages.mjs`. Open `index.html` for the catalog, `signal-press/index.html` for the specimen study, or `notes/neuromancer-hermes.html` for this document. The generated `notes/` and `_site/` directories remain ignored; committed Markdown is the source of truth.

## Provenance and preservation

All new illustration paths, glyph compositions, UI code, and prose are original work for this collection, generated in response to the user's direction. Original reference images and fonts are linked and described rather than republished. Temporary source downloads and QA screenshots stay outside commits. The user's permission to keep reference screenshots is recorded; the public collection still avoids redistributing third-party artwork.

Stable references:

- [Neuromancer](https://plasticlabs.ai/neuromancer)
- [Hermes Agent](https://hermes-agent.nousresearch.com/)
- [CSS blend modes — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode)
- [Automatic color preference — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [Reduced motion — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

Implementation evidence, inspected October 16, 2026; **hashed URLs are unstable**:

- [Neuromancer page chunk](https://plasticlabs.ai/_next/static/chunks/app/neuromancer/page-716f9e20f921d65e.js)
- [Hermes stylesheet](https://hermes-agent.nousresearch.com/marketing-static/_next/static/chunks/2n-8k-dxkswj0.css)

## Verification

Verification results are recorded after the final integration below. Source inspection does not establish listening quality, universal accessibility, or comparative runtime performance.

Integration checks on October 16, 2026:

- All 25 automated mechanics/audio/Markdown checks passed, alongside JavaScript syntax checks and the publication's local link/asset validation.
- Home and readable research were visually checked in light and dark themes; system preference selected dark on the test host. Signal Press was checked in both themes and its representation, ground, and density controls were exercised.
- A local HTTP preview under `/artifacts/` covered desktop and real iframe viewports at 320 × 568, 390 × 844, and 844 × 390 where relevant. The home and notes wrap within their reading width; comparison tables have their own scroll container.
- Clip Path's original eight-entry audit, assimilation outcome, purge interruption/restart, sound toggle, and crosshair were exercised. At 320 × 568, the panel stays 418 pixels tall while its 308-pixel log viewport scrolls approximately 608 pixels of content. An overflowing ASCII eye was contained; document width now equals viewport width.
- Sound was enabled through a user gesture and its controls exercised; subjective listening quality was not evaluated. Reduced-motion behavior has production-script tests; this session did not change the host operating system's preference.
- The browser tool rejects `file://`, so direct-file execution remains unverified. The same self-contained files were tested over HTTP. No cross-browser or comparative performance benchmark was conducted.
