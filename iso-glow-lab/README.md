# Iso-Glow Lab

An interactive 3D technical-line and outline pipeline workbench dissecting [isoglow.dev](https://isoglow.dev/) (`isoglow.dev/demo/3d#cs`, `isoglow.dev/demo/gallery/3d.html`, `isoglow.dev/demo/gallery/anatomy.html`, `isoglow.dev/demo/objects`, and `isoglow.dev/demo/lumen`) alongside the Gemini thread analysis of object-space crease extraction vs. image-space G-buffer Sobel post-processing. No affiliation with `isoglow.dev` / `@stevesouth`; all geometry, rasterization, and audio synthesis code are original.

## Run

```sh
node iso-glow-lab/build.mjs        # → iso-glow-lab/dist/iso-glow.html (opens directly from disk)
node --test iso-glow-lab/mechanics.test.mjs
```

Open `iso-glow-lab/dist/iso-glow.html` directly from disk (`file://`) or start at `iso-glow-lab/index.html` over any local HTTP server.

## What to Explore

1. **01 · 3D Outline & Glow Lab**:
   - **Four live outline pipelines** on an interactive 3D C-07 Stereo Cassette Deck + internal mechanical anatomy:
     - **Iso-Glow (Hysteresis + Hull)**: Reproduces `isoglow.dev/demo/gallery/3d.html` (`creaseInfo` + `creaseLines` hysteresis crease follower with union-find short-fragment pruning < 6 cm, two-tier minor/major line hierarchy, and `BackSide` inverted-hull curved silhouettes).
     - **Naive `EdgesGeometry`**: Hard threshold ($\theta \ge \theta_{\text{thr}}$) with no hysteresis continuation and no curved silhouette pass—exposing fragmented bevel fillets and un-outlined smooth cylinders.
     - **Sobel G-Buffer (`Depth + Normal + Object-ID`)**: Rasterizes a typed-array G-buffer (`Float32` linear depth, view-space normal $\mathbf{N}_v$, and integer `Uint16` part ID) and runs a $3 \times 3$ Sobel filter with view-normal grazing modulation $T_{\text{depth}}(\mathbf{N}) = T_{\text{base}}(1 + k(1 - N_z))$.
     - **Split Wipe (`Iso-Glow | Sobel`)**: Draggable vertical screen-space comparator across the live 3D deck.
   - **Inspection Views (`X`)**: Switch between **Composite**, **Edge Tier X-Ray** (color-coding Major ≥ 60°, Minor ≥ 30°, Hysteresis-rescued `[0.55θ, θ)`, and Curved Silhouette edges), and **4-Up G-Buffer** (Linear Depth, View Normal $\mathbf{N}_v$, Object-ID Part Map, and Sobel Edge Channels).
   - **Diagnostic Presets**: Jump to **Iso Default (35.3°)**, **Grazing Stress (11°)** (toggle $T_{\text{depth}}(\mathbf{N})$ off to see unmodulated depth Sobel flood the top deck with false ink), **Flush Coplanar Keys** (toggle Object-ID channel off while keys sit coplanar at 0.15 mm to see adjacent keys vanish), and **Anatomy Cutaway** (exploding the upper shell to expose the capstan flywheel, DC servo motor, 3-head block, and VU PCB).
   - **Interactive Transport & Procedural Web Audio**: Click the 3D transport keys directly or press `Space` (`PLAY`), `←` (`REW`), `→` (`FF`), `S` (`STOP`), `R` (`REC`). Synthesizes mechanical switch clicks, motor hum, tape hiss, and a warm lo-fi electric piano chord loop (`Dm9 → G13 → Cmaj9 → A7alt`) that speeds up and pitches during fast-wind.
2. **02 · 2D SVG ↔ 3D Kernel**:
   - Demonstrates how `isoglow.dev`'s 2D SVG engine (`ISO.kernel` with affine `<g transform="matrix(...)">` face wrappers) and 3D scene builder share the exact same `(x, y, z, w, d, h, r)` primitive coordinate table.
3. **03 · Study & Conflicts**:
   - Full technical and design study (`analysis.md`), including the evidence table contrasting the Gemini `CONTEXT.md` hypotheses against the live `3d.html` source, and the **Repo Rules vs. Gemini Prompt Conflict Ledger**.

## Source

- `mechanics.mjs`: DOM-free 2D/3D coordinate kernel, perspective $\leftrightarrow$ orthographic frustum solver, procedural C-07 Cassette Deck mesh generator, hysteresis crease extractor + union-find pruner, curved silhouette extractor, software G-buffer rasterizer (`depth`, `normal`, `objectId`), $3 \times 3$ Sobel pass with grazing modulation, analytic radial glow + hash dither, and differential reel physics.
- `mechanics.test.mjs`: Automated `node:test` suite verifying all geometric, hysteresis, G-buffer Sobel, and transport invariants.
- `app.js`, `index.html`, `style.css`: Interactive 3-tab workbench, Canvas 2D software 3D pipeline & G-buffer visualizer, and procedural Web Audio synthesizer.
- `build.mjs`: Bundles everything into `dist/iso-glow.html` (and `dist/artifact.html`) with VM script syntax checking and zero-external-asset enforcement.
- `analysis.md`: Evidence-based engineering and visual study.

## Assets and Provenance

All code, 3D geometry, shaders/rasterizers, and Web Audio synthesis are original. No external scripts, stylesheets, fonts, or media assets are bundled or fetched at runtime. `dist/` is ignored by the root `.gitignore`.
