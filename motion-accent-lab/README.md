# Motion Accent Lab

A comparative study of Anime.js, Vesper Drift (currently titled Avocet 2-6), and two X clips. The original artifact separates motion scheduling, authored SVG color regions, and actual quantized lighting. It includes an inspectable four-part timeline, three palettes, a tiny simulated export accent, and a Canvas lighting comparison.

## Open / build

The ready-built local artifact is `dist/motion-accent.html`. Double-click it to open it in your browser. It bundles Anime.js 4.5.0, the MIT license, original SVG, CSS, JavaScript, and the research text. It makes no runtime network requests; reference links are optional.

To rebuild with Node 22+:

```sh
npm ci --ignore-scripts
npm run build
node --test mechanics.test.mjs
```

No server is required by the artifact. The browser automation tool blocks the file protocol, so its interactive checks were performed through a temporary loopback HTTP preview; direct-file execution was not verified.

## Source

- `index.html`: original artwork, study layout, controls.
- `app.js`: real Anime.js object timeline, explicit SVG rendering, miniature accent, transport/lifecycle, and Canvas rendering.
- `mechanics.mjs`: sampling and illumination math.
- `build.mjs`: Node built-in packager, syntax checks on emitted scripts, runtime asset boundary, bundled research and license. Full UMD library is included for a simple portable build; this does not demonstrate a minimal tree-shaken production bundle.
- `analysis.md`: source study, evidence ledger, uncertainties, and verification.

Playback is one-shot. Pause and seeking are explicit; stepping samples poses at 12 fps while preserving the exact endpoint. System reduced motion or the preview checkbox shows the final state immediately on play. An IntersectionObserver suspends advancement when both the lab drawing and miniature are offscreen; visibility changes suspend the clock without hidden-time catch-up. The export is a simulation and generates no file.

This fixed-view SVG is a deliberately smaller alternative to Vesper's full Three.js scene. It has authored tones, not dynamic 3D lighting. The separate analytic sphere demonstrates the lighting math with evenly spaced bands; Vesper uses different thresholds, textured mesh shading, line geometry, and postprocessing. No original demo code or assets are copied. Neither X clip's production library was established.

Engram: **Motion as an accent: Anime.js, cel shading, and demo culture**, note `03h0qjten1sgq4fjkaatjwf03`, journal `engram`.

## Verification

Three focused tests pass: sampling boundaries/endpoints, backward seeking through the actual Anime.js timeline, and quantized illumination levels. The build validates both input and emitted JavaScript and rejects external script/style references. Browser checks cover playback/pause, backwards scrubbing, stepped poses, palettes, region/ink switches, reduced-motion export, normal export, offscreen suspension, and lighting controls. Desktop and 375/320 px layouts were inspected; narrow layouts had no horizontal overflow.

The generated bundle, dependencies, QA captures, and research downloads are ignored. Source and lockfile are intentional; ignore rules were reviewed against GitHub's Node template and the existing root baseline. No comparative performance or audio evaluation was performed.

Historical implementation (revision retired by the collection history reset): `7ea4787b63a93f961adfb087de5b7a7bc27ac6f2`. Older Engram code links target that retired revision; current source is in this checkout.
