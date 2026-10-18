---
tags:
  - ingest
  - isometric
  - webgl
  - threejs
  - non-photorealistic-rendering
  - outline-rendering
  - web-audio
---
# Iso-Glow: 3D technical line architecture, hysteresis creases, and outline pipelines

Study date: 2026-10-18. Engram status: Engram MCP tools were unavailable in this session; this tracked `analysis.md` (and its generated `/notes/iso-glow.html` and `/notes/iso-glow.md` companions) preserves the complete study draft for posting.

## Evidence boundary and inspected sources

Primary live sources inspected on 2026-10-18:

- [`https://isoglow.dev/`](https://isoglow.dev/) — Landing page, design tokens, SVG glow filters (`#glow`, `#soft`, `#bloom`), and skill documentation by [April Zhu](https://april-zhu.com/), built on [`iso-figure`](https://github.com/MrBongoC/ai-iso-skill) by Tolga Cohce (MIT).
- [`https://isoglow.dev/demo/3d#cs`](https://isoglow.dev/demo/3d#cs) and its embedded gallery shell [`https://isoglow.dev/demo/gallery/3d.html`](https://isoglow.dev/demo/gallery/3d.html) — Complete 3,026-line Three.js (`0.160.0`) implementation containing the C-07 Stereo Cassette Deck (`#cs`), Typewriter (`#tw`), DR-16 Drum Machine (`#dr`), Kitchen Timer (`#tm`), Vending Machine (`#vm`), Desk Computer (`#pc`), Desk Lamp (`#lp`), Logic Board (`#lg`), Server Rack (`#rk`), System Stack (`#sk`), Turntable (`#tt`), Instant Camera (`#pl`), and the reference SH-60B Seahawk (`heli`).
- [`https://isoglow.dev/demo/gallery/anatomy.html`](https://isoglow.dev/demo/gallery/anatomy.html) — Extended 3D cutaway/explode engine adding clipping planes (`CLIP`), screen-space derivative (`fwidth`) 45° cross-hatch section caps, 4-band stepped toon shaders with lathe grooves and volumetric Gaussian heat glow, SVG leader-line annotations, and a studio PBR toggle (`studio_small_09` HDRI).
- [`https://isoglow.dev/demo/objects`](https://isoglow.dev/demo/objects) and [`https://isoglow.dev/demo/lumen`](https://isoglow.dev/demo/lumen) — 2D SVG isometric kernel (`ISO.kernel`, `ISO.frame`) and the solid shaded `RW` gradient kit.

Also synthesized: the user-supplied Gemini web thread summary (`CONTEXT.md`) comparing object-space crease extraction against image-space G-buffer Sobel post-processing.

## Where the inspected `isoglow.dev` source differs from `CONTEXT.md`

Inspecting the actual production source of [`3d.html`](https://isoglow.dev/demo/gallery/3d.html) and [`anatomy.html`](https://isoglow.dev/demo/gallery/anatomy.html) reveals several engineering refinements that go beyond the standard Three.js idioms assumed in `CONTEXT.md`:

| Subsystem | `CONTEXT.md` hypothesis (Gemini web chat) | Inspected `isoglow.dev/demo/gallery/3d.html` implementation | Why the production choice matters |
| --- | --- | --- | --- |
| **Camera projection** | Fixed `THREE.OrthographicCamera` at `[d, d, d]` ($35.264^\circ$ elev, $45^\circ$ az). | Dual camera rig: defaults to a narrow `$28^\circ$` `PerspectiveCamera` along `normalize(1, 1, 1)` and toggles/animates into `OrthographicCamera` via `Iso view` (`I`), matching framing height via `orthoH = dist * 2 * tan(fov / 2)`. | Narrow-FOV perspective gives subtle depth convergence while orbiting; snapping to `Iso view` restores exact parallel axonometric projection without a scale jump. |
| **Crease extraction** | `THREE.EdgesGeometry(geom, 30)` + `THREE.LineSegments`, noting it fails on curved silhouettes or chops gentle curves. | Custom **hysteresis crease follower** (`creaseInfo` + `creaseLines`, lines 366–420) + **two-tier fat lines** (`LineSegments2` at `1 * dpr` px: minor $\ge 30^\circ$, major $\ge 60^\circ$) + **union-find pruning** ($< 6\text{ cm}$). | `EdgesGeometry` tests each edge in isolation, chopping gently curving panel lines into dashes. `creaseLines` seeds at $\theta \ge \theta_{\text{thr}}$ and grows along colinear neighbors ($\text{dot} > 0.9$) down to $0.55\,\theta_{\text{thr}}$. |
| **Curved silhouettes** | Assumed missing without facet exposure or an inverted-hull pass. | **Actually ships an inverted-hull `BackSide` pass** (`addOutline` / `outlineMat`, lines 241–255, 333) pushed outward in clip space by `thickness * 2.0 / res * p.w` with `polygonOffset(6, 24)`. | Extruded rounded boxes (`rbox` with 10-segment quadratic corner arcs), cylinders, and spheres get crisp continuous silhouettes while internal cylinder facets ($9^\circ\text{–}15^\circ$) stay unlined. |
| **Hidden-line occlusion** | Unlit `MeshBasicMaterial` matching background fill with `polygonOffset(1, 1)`. | `MeshStandardMaterial` (`#1b1c1f`, roughness `0.9`, metalness `0.05`, `polygonOffset(1, 1)`) lit by a 4-light rig (`HemisphereLight` + `AmbientLight` + 2 `DirectionalLight`s), or 4-band stepped toon shading in `anatomy.html`. | Subtle face normal shading separates top decks (`#202124`) from side walls (`#1b1c1f`) even before edge lines are drawn, matching the 2D `.face.top` vs `.face` hierarchy. |
| **Selective glow & post-processing** | Material swap + `UnrealBloomPass` (luminance thresholded). | **No `UnrealBloomPass`.** Explicit comment at line 259: *"no full-screen bloom, so no blocky upsampled halos."* Uses analytic per-pixel `THREE.Points` shaders (`glowPoints`), analytic `smoothstep` light-pool planes (`softMat`), and a full-screen $\pm 0.5/255$ hash-dither `ShaderPass`. | Downsampled Gaussian bloom turns 1px technical line work into blurry halos and creates blocky upsampling artifacts. Analytic radial shaders stay sharp at any DPI and cost zero extra render passes. |
| **Light-theme polarity** | Not covered in `CONTEXT.md`. | Hides all additive halos/pools (`visible = !light`), flips surviving overlays to `NormalBlending`, and patches `MeshStandardMaterial.onBeforeCompile` (`uAccentFill`) to mix lit surfaces toward a flat accent fill. | Additive orange/cyan light over a `#e9eaea` paper background washes out to low-contrast pastel. Treating light mode as a flat ink print preserves legibility. |

## Layer and algorithm breakdown

### 1. Shared 2D SVG and 3D coordinate kernel

Every rebuilt figure in `iso-glow` uses the exact same millimeter/centimeter box table `(x, y, z, w, d, h, r)` across both 2D SVG and 3D WebGL:

- **2D SVG (`ISO.kernel`, `demo/objects` lines 2501–2531)**: Projects 3D coordinates `(x, y, z)` to 2D SVG coordinates via:
  $$P(x, y, z) = \bigl((x - y)\cos 30^\circ + O_x,\; (x + y)\sin 30^\circ - z + O_y\bigr)$$
  Inscriptions on faces use affine `<g transform="matrix(...)">` groups (`TOP`, `FRONT`, `SIDE`) so ordinary 2D `<rect>`, `<circle>`, and `<text>` elements lie automatically in the isometric planes.
- **3D WebGL (`W(x, y, z)`, `3d.html` line 502)**: Maps the same `(x, y, z)` coordinates to Three.js right-handed world space (meters, $Y$-up) via:
  $$W(x, y, z) = (0.01\,x,\; 0.01\,z,\; 0.01\,y)$$
  Dynamic inscriptions (`topCanvas`, `faceCanvas`, `sideCanvas`) replace the SVG `<g transform="matrix(...)">` groups with high-DPI 2D `CanvasTexture` planes (`10–16 px` per unit, `anisotropy = 8`) pulled slightly off the surface with `polygonOffset(-4, -12)`.

### 2. Three-tier object-space line pipeline and depth biasing

To prevent z-fighting where coplanar hairlines, recessed panels, and silhouette shells meet, `3d.html` establishes a strict hardware `polygonOffset` hierarchy:

1. **Inverted-hull silhouette shell (`outlineMat`)**: `side: THREE.BackSide`, `polygonOffsetFactor: 6, polygonOffsetUnits: 24`. Pushed *behind* the hull so that when viewing open interiors (such as the Seahawk cabin or an open cutaway), the backface shell never pokes through interior walls. Its vertex shader projects the view-space normal into clip space (`n = projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0)`) and offsets `gl_Position.xy` by `normalize(n.xy) * thickness * 2.0 / res * p.w`.
2. **Solid occluder meshes (`bodyMat`, `capMat`)**: `polygonOffsetFactor: 1, polygonOffsetUnits: 1`. Pushed slightly back so coplanar line segments lying on their faces never z-fight.
3. **Recessed inset panels (`recessMat`)**: `polygonOffsetFactor: -1, polygonOffsetUnits: -1`. Pulled slightly in front of the parent deck face.
4. **Two-tier crease lines (`lineMat` and `majorMat`)**: `polygonOffsetFactor: -2, polygonOffsetUnits: -6`. Minor creases ($\theta \ge \theta_{\text{thr}}$, default $30^\circ$, `#27292c`) draw first; major folds ($\theta \ge \max(\theta_{\text{thr}}, 60^\circ)$, `#393c3f`) draw with `renderOrder = 1` so shared edges take the brighter major tier.
5. **Dynamic canvas displays and LEDs (`topCanvas`, `ledOnMat`)**: `polygonOffsetFactor: -4, polygonOffsetUnits: -12`.
6. **Zoom-dependent line-weight attenuation (`applyWeight`, lines 2743–2754)**: Computes screen density in CSS pixels per meter (`ppm`) and attenuates line colors toward `BG_COL` when zooming out:
   $$\text{fade} = f_{\min} + (1 - f_{\min}) \cdot \text{clamp}\!\left(\frac{\text{ppm}/40 - 0.35}{0.65},\; 0,\; 1\right)$$

### 3. Object-space (`creaseLines` + Hull) vs. Image-space (`Sobel G-Buffer`) trade-offs

The central architectural question explored in `CONTEXT.md` is when to extract lines in object space versus image space (post-processing Sobel over Depth, View Normal, and Object ID).

| Dimension | Naive `EdgesGeometry` (Object-Space) | `isoglow.dev` Hysteresis + Inverted Hull (Object-Space) | Post-Processing Sobel `Depth + Normal + ObjectID` (Image-Space) |
| --- | --- | --- | --- |
| ** Asymptotic cost** | $O(E)$ edges; 1 draw call per part. | $O(E)$ CPU setup once (`mergeVertices` + BFS + union-find); 2 fat-line + 1 backface hull draw call per part. | $O(W \times H)$ fragment pass independent of scene polygon count; requires MRT G-buffer pass. |
| **Curved fillets & cylinders** | **Fails**: either misses smooth cylinder silhouettes ($\theta_{\text{facet}} < 30^\circ$) or exposes every internal tessellation rib if $\theta_{\text{thr}}$ is lowered. | **Solved**: Inverted-hull `BackSide` pass captures smooth silhouettes while hysteresis ($\text{grow} = 0.55$, $\cos > 0.9$) bridges gently curving seams. | **Native**: Depth discontinuity $\lVert \nabla z \rVert$ captures smooth silhouettes of any curvature at 1px width without extra geometry. |
| **Flush coplanar part seams** | **Preserved** if parts are separate meshes with boundary edges. | **Preserved** (`ang = 180°` on open borders or distinct part meshes). | **Fails in Depth+Normal Sobel** ($\Delta z = 0, \Delta \mathbf{N} = \mathbf{0}$). **Requires a custom Object-ID channel** in the G-buffer (`id_neighbor != id_center`). |
| **Grazing-angle stability** | **Exact**: Geometric edges do not thicken or fill faces at shallow camera angles. | **Exact**: Geometric edges remain 1px wide at all viewing angles. | **Prone to grazing depth ink**: As $N_z \to 0$, $\lVert \nabla z \rVert \propto 1/N_z$ explodes across flat faces. **Requires view-normal modulation** $T_{\text{depth}}(\mathbf{N}) = T_{\text{base}}(1 + k(1 - N_z))$. |
| **Antialiasing & crispness** | Native hardware MSAA (`samples: 4`). | Native hardware MSAA on both `LineSegments2` quads and hull mesh. | Loses native MSAA on MRT G-buffers unless resolved per-sample or paired with SMAA/FXAA. |
| **Per-part selective glow / color** | Trivial material swap (`accentLineMat`) per part. | Trivial (`rimOn.visible = lit`, `r.line.material = accentLineMat`). | Requires storing per-part accent/glow flags in the G-buffer and dilating them across the Sobel kernel. |
| **Vertex deformation / skinning / SDFs** | Incompatible if topology or dihedral angles deform per frame. | Incompatible with per-frame CPU `mergeVertices` rebuilds on heavy meshes. | **Ideal**: Handles vertex shaders, morph targets, cloth, and raymarched SDFs at fixed screen cost. |

### 4. Procedural audio & transport state (`#cs` Cassette Deck)

In `3d.html` (lines 1134–1250), the C-07 Cassette Deck runs a self-contained state machine (`mode: 'stop' | 'play' | 'ff' | 'rew'`, `rec: boolean`, `count: 0..640`, `ang: radians`):

- **Differential reel kinematics**: As tape count $c \in [0, 640]$ advances, the supply and take-up pack radii interpolate linearly between $6$ and $19$ units ($r_1 = 6 + 13(1 - c/640)$, $r_2 = 6 + 13(c/640)$), and the supply hub rotation angle scales by $1 + (r_2 - r_1)/40$ to reflect conservation of linear tape speed past the capstan.
- **Hold-to-wind interaction**: Pointer-down on `FF` or `REW` disables `OrbitControls` while held (`controls.enabled = false`); releasing after $> 350\text{ ms}$ automatically drops the transport back to `stop` (momentary cueing), whereas a quick tap latches high-speed wind.
- **Web Audio lo-fi synthesizer**: Created lazily on the first user gesture (`startAudio`). Schedules a 4-bar, 76 BPM eighth-note chord progression (`Am7 – Fmaj7 – Cmaj7 – G7`) using detuned triangle pad oscillators, a sine sub-bass, a swung square arpeggiator, kick pitch-drop envelopes, and filtered noise hi-hats routed through a resonant lowpass filter (`1500 Hz`, $Q = 0.8$) modulated by a `0.18 Hz` LFO (`±500 Hz`) for tape wow/flutter. A `ChannelSplitterNode` + stereo `AnalyserNode` pair computes real-time time-domain RMS in dB to drive the 12-segment L/R VU meters.

## Repository vs. Gemini prompt conflict ledger

As requested, here are the specific conflicts between the suggested Gemini web prompt and the local `artifacts` repository rules (`AGENTS.md` and `.agents/skills/ingest/SKILL.md`), and how this implementation resolved them:

1. **Workspace location (`~/iso-glow-lab` vs. `artifacts/iso-glow-lab/`)**:
   - *Gemini prompt*: Suggested creating an external scratch directory `~/iso-glow-lab` and a standalone `CONTEXT.md`.
   - *Local repo rule followed*: Placed the experiment inside the repository at `iso-glow-lab/` with tracked `analysis.md`, `README.md`, `index.html`, `style.css`, `mechanics.mjs`, `app.js`, `build.mjs`, and `mechanics.test.mjs`, and registered it in root `index.html`, `docs/artifact-catalog.md`, `scripts/build-notes.mjs`, and `scripts/build-pages.mjs`.
2. **Third-party skill archive (`curl .../iso-glow.tar.gz | tar -xz -C .agents/skills`)**:
   - *Gemini prompt*: Suggested extracting the remote `iso-glow.tar.gz` archive directly into `.agents/skills`.
   - *Local repo rule followed*: Per `AGENTS.md` Rules 3 & 5 and `ingest/SKILL.md`, we did not pollute `.agents/skills` or commit third-party archives/code. Instead, we inspected the live public sources (`isoglow.dev`) via HTTP, documented provenance, and wrote 100% original code.
3. **External CDN dependency (`cdn.jsdelivr.net/npm/three@0.160.0`) & bundle size vs. self-contained offline HTML**:
   - *Gemini prompt / `isoglow.dev` 3D template*: Loads Three.js and 8 JSM addons over the network via `<script type="importmap">` (and `anatomy.html` embeds a 2.5 MB base64 blob).
   - *Local repo rule followed*: Built a **zero-dependency, self-contained HTML artifact** (`iso-glow-lab/dist/iso-glow.html`, ~95 KB total) that passes the strict `build.mjs` check rejecting any external `<script src>` or `<link href>`, opens directly from disk without a server or internet connection, and implements both the object-space hysteresis/hull pipeline and the image-space G-buffer Sobel pipeline directly in inspectable vanilla JavaScript.

## Artifact implementation and differences

Implemented in `iso-glow-lab/`. Build with `node iso-glow-lab/build.mjs` to produce `iso-glow-lab/dist/iso-glow.html`.

Unlike `isoglow.dev/demo/gallery/3d.html` (which renders only its chosen object-space pipeline via Three.js), our local educational workbench implements **both** architectures in a dependency-free 3D projection + G-buffer rasterizer (`mechanics.mjs` + `app.js`) so you can compare them live on the interactive **C-07 Stereo Cassette Deck**:

- **Four interactive pipeline modes**:
  1. `Iso-Glow Object-Space (Hysteresis + Hull)`: Seeds creases at $\ge \theta_{\text{thr}}$, grows colinear chains down to $0.55\,\theta_{\text{thr}}$, prunes fragments $< 6\text{ cm}$, separates minor/major crease tiers, and extracts smooth curved silhouettes.
  2. `Naive EdgesGeometry (Object-Space)`: Disables hysteresis, fragment pruning, and curved silhouette extraction so you can observe broken fillet dashes and missing cylinder silhouettes (or internal facet clutter when lowering $\theta_{\text{thr}}$).
  3. `Sobel G-Buffer (Image-Space: Depth + Normal + ObjectID)`: Rasterizes a per-pixel G-buffer (`Depth`, `View Normal`, `Object ID`) and runs a 3×3 Sobel edge detector with interactive toggles for **View-Normal Grazing Modulation** $T_{\text{depth}}(\mathbf{N}) = T_{\text{base}}(1 + k(1 - N_z))$ and **Object-ID Coplanar Seams**.
  4. `Split-Screen Wipe (Object-Space vs. Sobel)`: Draggable vertical split divider comparing both pipelines across the spinning deck in real time.
- **Diagnostic X-Ray & G-Buffer views**: Switch between `Final Composite`, `Classified Edge Channels` (color-coding Silhouette, Major Fold, Minor Crease, Hysteresis-Rescued, and Pruned fragments—or in Sobel mode: Depth, Normal, Object-ID Coplanar Seam, and False Grazing Ink!), and `4-Up G-Buffer Inspector` (`View Normal N`, `Linear Depth z`, `Part/Object ID`, and live `2D Canvas Textures`).
- **Interactive C-07 Hardware Deck + Cutaway/Explode**: Full `PLAY`, `REW`, `FF`, `STOP`, `REC` transport, procedural Web Audio lo-fi loop + mechanical switch clicks, 6 accent swatches (`Ember`, `Cyan`, `Lime`, `Violet`, `Rose`, `Ice`), Dark/Light polarity switch, Perspective $\leftrightarrow$ Orthographic camera morph, **Grazing-Angle Stress Test** camera preset, **Flush Coplanar Key Seam** toggle, **Explode Assembly** slider, and **Section Cutaway** slider exposing the internal capstan flywheel, motor, and 3-head block.

## Verification

- `node --test iso-glow-lab/mechanics.test.mjs`: All 6 unit tests pass (2D/3D coordinate & frustum equivalence, hysteresis crease rescue + union-find fragment pruning, smooth cylinder silhouette extraction, G-buffer Sobel grazing-angle modulation, G-buffer Object-ID coplanar seam recovery, and tape transport kinematics + analytic glow/dither bounds).
- `node iso-glow-lab/build.mjs`: Validates JavaScript syntax via `node:vm` `Script` and confirms zero external runtime script or stylesheet dependencies in `iso-glow-lab/dist/iso-glow.html`.
- `node scripts/build-pages.mjs`: Builds all repository projects, renders `notes/iso-glow.html` and `notes/iso-glow.md`, and verifies every internal link and asset in `_site/`.
