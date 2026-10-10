---
tags:
  - design
  - ascii
  - oxide
  - experiments
---

# Oxide blog headers: static scaffolding, living text

Inspected 9 October 2026. These are implementation observations from public HTML, CSS, JavaScript modules, and browser views. A linked animation module describes the deployed implementation at inspection time; its hashed URL may change. The demo uses original approximations, not copied assets or source.

## Two header families

The [Glasswing post](https://oxide.computer/blog/oxide-anthropic-project-glasswing) and [Series D announcement](https://oxide.computer/blog/our-445m-series-d) use an animated feature header. The [Series B](https://oxide.computer/blog/our-100m-series-b) and [Series C](https://oxide.computer/blog/our-200m-series-c) announcements use the same family with different drawing programs.

In contrast, [Performance Has Layers](https://oxide.computer/blog/performance-has-layers), [iddqd, or the hardest kind of unsafe Rust](https://oxide.computer/blog/iddqd-unsafe), and [The Cloud Computer](https://oxide.computer/blog/the-cloud-computer) use a static editorial header: uppercase monospaced date, large sans-serif title, author identity, divider, then prose. The title and author align with the narrower reading column inside a 12-column outer layout. At 800px it occupies ten columns, and at 1200px eight. Presence of animation-related imports elsewhere in a page is not evidence that its article header animates.

## The feature header, layer by layer

1. A neutral background band encloses a centered container, capped at 1200px. Desktop adds breathing room, a subtle border and small radius; narrow screens use the available width.
2. A whitespace `pre` reserves the field's geometry before its program loads. This is a size scaffold, not a finished static illustration.
3. A separate absolutely positioned animation wrapper draws real monospaced text. Row spans contain runs of characters sharing color and weight. This is neither video nor a canvas.
4. Two independent overlay groups draw vertical and horizontal grid lines at two-character intervals. Grid lines ignore pointer input; they are not produced by the drawing algorithm.
5. The real HTML `h1` sits independently over the lower part of the composition. A ResizeObserver supplies dimensions; type size and line height derive from header height, with font cap-height adjustments. The title fades in once its dimensions exist. It does not deform with the field.
6. Authors and uppercase date sit below the illustration, above a thin divider. Then the layout contracts to the reading column.

The feature grid is **144 columns × 24 rows**, changing to **72 × 24** below 800px. Container-relative font sizes approximately double on narrow layouts (1.1195cqw to 2.239cqw). This deliberately changes the composition's aspect ratio instead of squeezing a desktop bitmap. The grayscale grid, low-key accent, and stable typography provide visual order.

## Four drawing programs

| Post | Actual drawing structure | Motion and palette |
| --- | --- | --- |
| Glasswing | Twelve sites travel through 4D simplex-noise samples. At each cell, compute the nearest and second-nearest site distances. Their difference maps to a punctuation ramp, leaving the farthest values blank; this reveals Voronoi-like boundaries. Vertical distance is scaled for the character aspect. | 30 fps; speed decays multiplicatively from 0.02 toward a small nonzero floor. Ochre `#9A6C00`. |
| Series D | A rising profile combines three frequencies of smooth value noise. The edge is quantized into full/half blocks, with `#`, `:`, and middle-dot shading below. | 30 fps; fast initial scroll slows to a nonzero floor. Purple `#8F5CAD`. |
| Series B | A signed-distance field models two thin rotating disks. Orthographic rays march up to 32 steps; disk edges use vertical bars, faces use dashes, misses use dots. | 10 fps; rotation slows after the opening frames. Green `#238A5E`, dark gray dot field. |
| Series C | Packed 8×9 digit bitmaps map to large block glyphs over dots. A repeated 200,000,000 pattern resolves from randomized digits and alternating scale factors. | 10 fps; scramble stops at frame 30, leaving a static display. Dark greens `#204D3B` / `#1C372E`. |

This is more specific than “ASCII art that wiggles.” Each program samples a mathematical or discrete representation into the same cell interface. Some continue in slow motion; one settles completely.

## Runtime details worth keeping

The [shared renderer](https://oxide.computer/assets/ascii-animation-HIlhIBO3.js) uses requestAnimationFrame with a program-specific frame-rate cap. It measures the loaded font to determine cell geometry, invokes per-frame and per-cell hooks, compares cells with the previous frame, and rewrites only changed rows. It groups adjacent cells with matching style into spans, reducing DOM fragmentation; accent colors have hexadecimal fallbacks and display-P3 declarations.

The React wrapper observes visibility and reduced-motion preferences. It initializes once, starts playback after the field becomes sufficiently visible, and stops playback out of view. Reduced motion retains a rendered frame rather than discarding the field. The animation wrapper is marked aria-hidden; the meaningful headline remains readable HTML. A decorative animation label on an aria-hidden wrapper does not provide an accessible alternative by itself.

Public implementation references: [blog route and layered feature layout](https://oxide.computer/assets/route-XSRqktb7.js), [editorial header](https://oxide.computer/assets/blog-header-C0lXadtJ.js), [CSS](https://oxide.computer/assets/index-eOco3KxN.css), [Glasswing program](https://oxide.computer/assets/glasswing-CmxtLZto.js), [Series D program](https://oxide.computer/assets/seriesD-BdU7t6kn.js), [Series B program](https://oxide.computer/assets/seriesB-vW__Kqjb.js), [Series C program](https://oxide.computer/assets/seriesC-BDDRGJcy.js).

## Local experiments and useful permutations

`oxide-header-lab/index.html` demonstrates four inspired motifs and two original permutations. All headlines are fictional, not claims about current Hacker News submissions.

- Glass boundaries: open models, security audits, reverse engineering. Moving edges suggest inspectable boundaries without resorting to padlocks or brains.
- Rising contour: bootstrapped infrastructure, a launch, a benchmark story. The landscape suggests momentum; it is decorative, not a measured chart.
- Rotating disks: hardware, emulation, a computer built from first principles. The local demo uses analytic ellipse projection rather than Oxide's ray marching.
- Bitmap numbers: a tiny database or a compact compiler. The local font is 3×5, and the repeating number is 200 rather than the financing figure.
- Packet routes: an observable network, a home lab, or a distributed-system visualizer. Keep routes fixed and move only packet markers.
- Cellular garden: a small C program, Conway Life, or a generative system. Stable structures and changing cells make the algorithm itself the illustration.

The demo uses plain textContent updates at up to 30 fps, one accent per study, independent grid and headline toggles, a static editorial switch, reseeding, and pause/play. Unlike Oxide's renderer it rewrites the full monochrome field rather than diffing styled rows. It has a 700px breakpoint, standard local fonts, no React, no remote assets, and explicit user controls. It starts paused for reduced-motion users and stops simulation advancement when offscreen or hidden. These are experiments in the structure, not pixel-perfect reproductions.

The reusable recipe: choose a story-related mathematical field; sample it into a restrained glyph vocabulary; preserve a strong static frame; render title and metadata as ordinary HTML; make the paused frame work. Before applying this to production, tune contrast, title length, cell count, frame budget, and mobile layout together.
