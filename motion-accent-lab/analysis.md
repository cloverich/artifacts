---
tags:
  - animation
  - animejs
  - cel-shading
  - ingest
  - web-design
---
# Motion as an accent: Anime.js, cel shading, and demo culture

Inspected 9 October 2026. This is a comparative study prompted by a desire to use animation and illustrated cel aesthetics in everyday personal software.

## The useful distinction
An animation engine changes values over time. A renderer turns those values and assets into pixels. Art direction chooses shapes, palette, lighting bands, texture, composition, and timing. Anime.js can coordinate DOM, SVG, and numerical JavaScript properties, so it can sit upstream of a Canvas or Three.js renderer. It does not supply a drawing, mesh, toon shader, model rig, or finished film. An LLM can help write those layers, but the decomposition still matters.

Input/event → timeline or simulation → pose/state → SVG/Canvas/WebGL rendering → optional postprocessing. A short export success cue might need only the first four stages with SVG. A navigable asteroid belt needs camera transforms, geometry, lighting, object management, and rendering as well.

## Evidence ledger

### Anime.js
Observed in a browser: the landing page begins with an elaborate dark mechanical scene, which transforms as the page is scrolled. It combines rendered machinery, labeled features, and readable HTML. The demonstration is an engineered showcase, not evidence that importing the animation library alone produces a 3D scene.

Implementation evidence: the public home.js bundle imports numerous hashed chunks and contains custom ShaderMaterial constructions. Its dependency bundle includes renderer-related code; we did not dissect the complete scene or measure runtime performance. The source and browser observations support a rendering layer beyond simple HTML transitions. The official v4 documentation establishes createTimeline(), timeline positions, and animation of numerical/color object properties with onRender. The npm registry resolved animejs 4.5.0 during this study. Homepage size figures differed between the text crawler and live browser; no size claim is relied upon.

### Vesper Drift / Avocet 2-6
Observed: the supplied Vesper Drift URL currently serves an experience titled Avocet 2-6. An ivory and oxide-red spacecraft sits in a dense belt of craggy rocks against charcoal space. Orbit controls and keyboard/touch flight controls make it interactive rather than a prerecorded video. The info panel describes an endless asteroid belt and exposes cruise, view, and art controls. Its source-card says "Source not published"; nevertheless, readable client scripts are served publicly. This is not a published source repository or a license to reuse the implementation.

Inspected implementation: main.js imports a local Three.js module plus ship.js, materials.js, belt.js, and flight-controls.js. It creates a WebGLRenderer, a perspective camera, a multisampled render target, and a second full-screen pass. The inspected scene modules contain no Anime.js or GSAP import. That establishes the examined scene's own motion/rendering path, not a universal absence from every shell script or prior version.

The ship is assembled procedurally from geometry, including extrusions and beveled boxes. EdgesGeometry with a 25-degree threshold gathers hard edges into LineSegments. This is explicit geometry linework, not a screen-space outline detector or a silhouette inflation shader.

materials.js computes dot(normal, lightDirection) and assigns four illumination levels. Hull thresholds are -0.22, 0.14, and 0.56, producing multipliers 0.24, 0.48, 0.78, and 1. Noise adds sparse wear and elongated scratches. Rock shading perturbs illumination with multiple noise frequencies, uses another four-level ramp, and darkens low-noise patches. Material color times this intensity produces the painted surface. A contrast parameter blends toward a flatter level.

The film pass samples the rendered image, applies a radial vignette, and adds hashed grain whose seed advances at 12 Hz. Changing the grain seed at 12 Hz does not mean geometry or flight is rendered at 12 fps. It is a separate stylistic cadence.

belt.js creates seeded distorted icosahedra with crater depressions. Nine rock variants × three geometry detail levels form instanced bins. Default asteroid count is 24,000; this is configured count, not a performance measurement. Each frame selects detail by distance/apparent size, writes instance transforms and fade attributes, and recycles positions by modular wraparound. A fade near the field boundary conceals recycling. Instancing reduces repeated object submissions, but CPU updates and rendering still have costs.

main.js schedules requestAnimationFrame, clamps simulation delta to 45 ms, updates flight/camera, renders the scene to a texture, then renders film processing to screen. Pixel ratio is capped at 1.65. The settings include pause, but the render loop still runs when simulation is paused. No claim of background or reduced-motion compliance has been established for the reference.

### antic's X clip
The web crawler returned 403, but the interactive browser opened the public post and played the clip muted. The post says it gave the author "the feels"; the visible follow-up links a Suno song, Scale of the Universe. Sampled frames showed an asteroid field followed by an illustrated ancestral camp under a night sky, with a deep-time caption. The player reports 3:42 duration. Only representative early frames were inspected, not the entire film, audio, or production files. No supplied implementation or creator attribution identifies Anime.js. A video file could have been made from browser graphics, an offline renderer, editing software, generated assets, or a combination. Its pixels alone cannot identify the production stack.

### Ryan's X clip
The browser opened the public post. The text describes support for theming and generating figures with styled colors. Representative video frames show an isometric desk computer with a palette selector: paper, light, dark, blueprint, and sepia. The player reports 16 seconds. This suggests reusable geometry and semantic palette tokens, but source, tool name, and drawing format were not established. The aesthetic can be reproduced with SVG polygons, Canvas geometry, or 3D rendering; the clip does not establish which was used or whether Anime.js drives it. A reply mentions another author's related experiment; that is not evidence for this clip's stack.

## Transfer to everyday work
Start with one purposeful event: export completion, item placement, a route reveal, an empty-state illustration, or a diagram transition. A short motion should help explain a state change or reward completion, then settle. Keep names, status text, and controls as accessible HTML. Never make task completion depend on watching decorative movement.

A good first architecture for the user's taste is original SVG artwork with flat palette regions, restrained linework, and Anime.js timelines for assembly, reveal, or a brief bounce. Use semantic color roles so a theme changes a drawing coherently. Group SVG parts by how they move, not only how they look. A persistent mascot or full-page moving backdrop imposes more attention and lifecycle cost than an occasional accent.

For true changing 3D light, use Three.js MeshToonMaterial or a custom shader. The docs require nearest filtering for a toon gradient map; linework is an additional choice. For fixed-view illustrative objects, three polygons per box and authored flat tones may capture the desired feel without a full 3D stack. That is an illustration technique, not dynamic cel lighting. Canvas 2D can expose a normal/light calculation on a sphere without a mesh engine; this is useful educationally but not a claim that it replaces Three.js for a dense navigable scene.

## Choices and limits
- CSS transitions: one state change or hover/focus cue; minimal orchestration machinery, but multi-part coordination grows awkward.
- Native Web Animations: element keyframes with playback controls, avoiding a runtime library; composition, object state, and complex schedules may require more glue.
- Anime.js: useful when sequencing, stagger, object tweening, or SVG utilities remove real coordination work. Import the relevant APIs and manage cancellation/cleanup. Avoid running competing controllers on the same property.
- SVG: inspectable, scalable, themeable, well suited to a small illustration. Many independently animated nodes increase maintenance and DOM work.
- Canvas 2D: compact procedural drawings or moderate custom fields; redraws and text/accessibility need deliberate handling.
- Three.js/WebGL: changing viewpoints, geometry, material lighting, and dense instanced scenes. Adds asset/shader and GPU lifecycle complexity. No comparative performance benchmark was performed.
- Prerendered video: appropriate for a film; limited interaction, format/loading costs, and separate accessibility requirements. A film's striking frames should not be confused with an interactive UI implementation.

Respect prefers-reduced-motion and changes to that preference. Offer pause for recurring motion, suspend advancement while hidden/offscreen, and make seeking deterministic. Do not fake progress percentages for a real asynchronous operation. The local demo's export progress is explicitly illustrative.

## Original artifact scope
A standalone Motion Accent Lab will use real pinned Anime.js for a scrub-able one-shot SVG timeline, original isometric artwork and palette switching, and a Canvas normal/light comparison showing continuous versus quantized illumination. It will demonstrate an ordinary document-export accent beside its mechanism, and will expose flat regions, ink, bands, timing, and step cadence. It is not a copy of the ship, website mechanism, or either X film. Audio and dense asteroid simulation are outside scope.

## Sources
- [Anime.js](https://animejs.com/)
- [Timeline API](https://animejs.com/documentation/timeline/)
- [Object properties](https://animejs.com/documentation/animation/animatable-properties/javascript-object-properties/)
- [Homepage bundle](https://animejs.com/assets/js/home.js?v=1787698626) — mutable query-versioned source; imported hashed chunks are unstable.
- [Vesper Drift live experience](https://labs.sntx.co/experiments/vesper-drift/)
- [Iframe entry](https://labs.sntx.co/experiments/vesper-drift/experience.html)
- [Scene loop](https://labs.sntx.co/experiments/vesper-drift/main.js)
- [Materials](https://labs.sntx.co/experiments/vesper-drift/materials.js)
- [Ship geometry](https://labs.sntx.co/experiments/vesper-drift/ship.js)
- [Asteroid field](https://labs.sntx.co/experiments/vesper-drift/belt.js)
- [antic post](https://x.com/antic/status/2108582512960368715)
- [Ryan post](https://x.com/wheresryan22/status/2108172796367106142)
- [Three.js MeshToonMaterial](https://threejs.org/docs/pages/MeshToonMaterial.html)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [GitHub Node ignore baseline](https://github.com/github/gitignore/blob/main/Node.gitignore)

Research is source inspection and sampled visual observation, not an audio comparison or performance benchmark.

## Built artifact and verification

The implementation is at /Users/cloverich/code/artifacts/motion-accent-lab. Run npm ci --ignore-scripts, npm run build, then open dist/motion-accent.html. Node 22+ is sufficient. The generated file bundles pinned Anime.js 4.5.0, its MIT license, original SVG, CSS, classic JavaScript, and this research. There are no external runtime assets. The full UMD bundle is a deliberate packaging shortcut, not a minimal tree-shaken production example.

The large SVG and product-size miniature share a manually sampled Anime.js object timeline. Its four tracks animate paper translation, mark drawing, seal scale, and a settling gesture. The timeline is paused internally; a single explicit clock owns seeking and rendering. Twelve-fps mode samples poses, not browser repaint. No idle loop runs. The reduced-motion path resolves directly to the completed pose. Visibility and intersection checks suspend advancement and clear elapsed-time history; simulation catches up only while visible, with delta capped at 50 ms. The miniature stays in the paper palette while the larger drawing offers theme exploration.

The separate lighting example computes normals on an analytic sphere in Canvas 2D and rounds direct illumination to evenly spaced bands. It does not recreate Vesper's meshes, custom thresholds, procedural noise/wear, instanced asteroid system, camera flight, or film pass. No reference assets or code were copied. The export interaction is explicitly simulated and generates no file.

Three focused Node tests pass: sample boundaries and exact endpoint; backward seeking using actual Anime.js with numeric tolerance; and illumination band count/ambient floor. Build checks validate input and emitted JavaScript and reject external script/style references. Browser checks of the HTTP preview verified playback, pause, scrubbing, 12-fps selection, palette changes, ink/region controls, reduced-motion export, normal completion, stable offscreen suspension, and alternate lighting direction/band/outline states. Normal completion reached 1800 ms and the status announced demo export ready. Desktop, 375 px, and 320 px layouts were visually inspected; narrow document scroll width did not exceed client width.

The first browser run exposed replacement-string corruption of the bundled dependency. The builder now uses replacement callbacks and validates emitted scripts. No new runtime errors were observed after that correction; historic log entries persisted in the first preview tab. Direct file-protocol browser access was blocked, so direct-file playback is not claimed. The HTTP checks and static bundle checks are separate evidence. System reduced-motion change handling and document visibility behavior were reviewed in source; the preview checkbox and offscreen behavior were exercised, but no OS preference toggle or hidden-tab timing measurement was performed.

Engram note ID: 03h0qjten1sgq4fjkaatjwf03. Source, lockfile, research, README, and project ignore rules are tracked. Dependencies, generated dist, temporary research, and screenshots are ignored. A local review capture is screenshots/review.png.
Implementation commit: [7ea4787](/code/artifacts@7ea4787b63a93f961adfb087de5b7a7bc27ac6f2). Source: [app.js](/code/artifacts@7ea4787b63a93f961adfb087de5b7a7bc27ac6f2/motion-accent-lab/app.js), [index.html](/code/artifacts@7ea4787b63a93f961adfb087de5b7a7bc27ac6f2/motion-accent-lab/index.html), [build.mjs](/code/artifacts@7ea4787b63a93f961adfb087de5b7a7bc27ac6f2/motion-accent-lab/build.mjs).
