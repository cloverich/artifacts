# OpenTunnel: printed fields and a small sonic machine

Inspected 9 October 2026. The earlier [Oxide study](../oxide-header-lab/analysis.md) treats mathematical fields as text cells under a stable editorial frame. [OpenTunnel](https://opentunnel.xyz/) applies a similar separation using GPU fragments, small raster packets, vector diagrams, and synthesized sound. The implementation observations below come from its public deployed HTML, CSS, JavaScript, and a browser view. They describe the inspected deployment, not a permanent API. The local implementation is an original approximation.

## What is actually on the page

A black page, a vivid red tunnel mark beside a tall condensed wordmark, small monospaced annotations, and an almost monochrome network diagram. A visitor sends a symbol through a relay to one of three applications on a local machine. Symbols are visibly scrambled during transit. The relay glows as traffic traverses it, and the machine boundary behaves like a membrane. Destination shapes resolve after arrival. The diagram's accessible description communicates the encryption story independently of decorative canvases.

The header tunnel is separate from the network animation. It is not a 3D mesh, video, ASCII renderer, or audio visualizer. Both are compositions of independent layers. The conceptual strength is that the relay can register activity without revealing the packet's readable shape. This is a visual explanation of the site's claims, not proof of the underlying network security.

## The tunnel shader

The header requests WebGL2 with antialiasing off, opaque output, and a low-power preference. A single oversized triangle covers the canvas. Its fragment shader constructs a procedural ink-coverage field:

1. Normalize fragment coordinates by canvas height. Subtract a configurable eye position, then calculate radius and normalized direction.
2. Use inverse radius as perspective depth (`depth / max(radius, floor)`). A sinusoid in depth and time creates bands compressed toward the vanishing point.
3. Sample several octaves of smooth value noise, rotating and scaling the domain between octaves. Noise on normalized direction avoids a discontinuity at the angular seam. Separate noise warps the bands and tears streaks through the walls.
4. Suppress coverage at the eye so red paper burns through. Weight the upper corners more heavily. A separate turbulent ground field contributes dark ink below the eye.
5. Compare coverage against interleaved gradient noise sampled in CSS-pixel cells. Emit one of two colors: black ink or red paper. The apparent shading is stipple density, not a gradient or actual type glyphs.

Observed defaults include depth 0.33, ring frequency 3.5, ring speed 14, warp 5, streak amount 1.6, animation speed 0.12, and 1 CSS-pixel grain. These values work together; ring speed is multiplied by the slower scene clock. Device pixel ratio is capped at 2 and the cell size is multiplied by that ratio, preserving grain scale across displays. Reduced motion keeps a rendered frame. Intersection and document visibility observers gate playback.

The reusable idea is **continuous shape first, print texture last**. Changing the grain does not change the geometry. Putting random dots directly into the geometry would make an unstable, noisy silhouette.

## The diagram is a hybrid

The deployed bundle contains React and motion-value animation infrastructure. The meaningful scene is assembled from SVG/HTML, Canvas 2D, and several small transparent WebGL2 canvases:

| Layer | Observed implementation | Why it matters |
| --- | --- | --- |
| Frames, wires, icons, labels | Vector and HTML elements | Geometry and explanatory text stay crisp and stable. |
| Cipher packets | Canvas 2D, small generated ImageData sprites | Horizontal displacement, column noise, and shape masks turn a circle, triangle, or square into an unreadable traveling mark. |
| Relay field | Fragment shader with up to four moving fronts | Gaussian cores and broad glows are bent by low-frequency turbulence. |
| Relay afterburn | Per-column timestamp texture | The shader computes age since passage, producing a decaying wake, hot ember, and diagonal hatch. This is explicit spatial history, not feedback from an earlier color buffer. |
| Machine membrane | Narrow fragment field at the boundary | Noise warbles the line; packet pressure bows it inward; a pulse propagates vertically after crossing. |
| Socket bursts | Separate fragment shader | Small turbulent radial fields expand and decay around contacts. |

The membrane's displacement combines a slow warble, a Gaussian bow around the packet's entry point, and a traveling pulse. Energy increases during approach and crossing. Ridged noise supplies filaments; sparse random sparks fall on the machine side. The soft halo is partly printed with a 4×4 Bayer threshold while the bright core remains smoother. This differs from the header's strict two-color stipple. Transparent shaders emit premultiplied color and alpha.

The diagram therefore has multiple texture vocabularies: a printed header, soft turbulent relay light, a dithered membrane, and scrambled raster symbols. Calling all of it “one slick shader” misses the coordination work.

## Sound follows events and motion

Sound starts off. Web Audio is initialized/resumed after user activation. No audio file is needed for the inspected diagram's sound synthesis path. The bundle builds oscillator and noise layers with attack/decay envelopes, filters, gain nodes, optional filtered feedback delay, and a shared compressor.

The event schedule includes `tick`, `pick`, `seal`, `open`, `dispatch`, `plunge`, and route-specific `strike` events. Very short filtered noise and high tones make ticks. Selection uses a small rising tonal gesture. A sealing voice falls from 150 to 68 Hz and closes a low-pass noise filter. Arrival combines noise, a short pitch glide, and delayed higher harmonics. Three destination pitches are related by ratios 1, 1.25, and 1.5.

There is also a sustained transit voice: seeded looping noise plus sine, triangle, and overtone oscillators. Its pitch, noise cutoff, gain, and resonance respond to packet speed and depth in the relay. As a packet enters, the voice becomes quieter and more filtered. This is motion controlling synthesis, rather than microphone input or FFT analysis controlling graphics.

Events are discovered between the previous and current scene times, including wrapped loops. The observed listener silences when animation is inactive, time goes backwards, or a discontinuity exceeds 0.12 seconds. That prevents scrubbing or returning to a background tab from emitting a backlog of stale events. Cleanup stops sources and disconnects nodes. Smooth envelopes and target ramps prevent clicks at parameter changes.

I inspected the sound toggle and synthesis implementation; I have not independently recorded or acoustically measured the original output. Voice descriptions above characterize the source rather than a calibrated listening comparison.

## Local experiment

`index.html` presents a larger printed tunnel and a three-route diagram, accompanied by controls and compact explanations. It keeps the composition monochrome with one hot accent and ordinary readable HTML text. All shader equations, vector marks, and synthesized voices are written locally.

The tunnel uses inverse-radius bands, seamless direction-domain noise, wall breakup, eye falloff, and CSS-sized ordered stipple. The local field offers printed, continuous, and band-only inspection modes. Grain and turbulence controls expose the distinction between geometry and printing.

The diagram uses a single full-stage transparent WebGL2 field plus SVG frames, packets, and wires. A shared deterministic 12-second timeline dispatches three packets. The local relay wake is reconstructed analytically from scheduled passage times instead of uploading a timestamp texture. Packet scrambling uses SVG line fragments rather than ImageData sprites. Both decisions simplify inspection and keep the experiment dependency-free; they are differences from the source, not exact reproductions.

The local audio uses original short oscillator/filter/noise voices, a continuously modulated transit bed, stereo placement, and route-dependent pitches. Visual and audio events share the same event table. Scrubbing stays silent; pause, hidden tabs, offscreen views, and disabled sound mute the bus. Optional layers reveal structure, field light, and readable/cipher packet states separately. This is a finite animation of a story, not a functioning tunnel or cryptographic demonstration.

## Where this approach travels well

- Queues and message brokers: stable topology, envelopes in transit, arrival voices differentiated by destination.
- Build or deploy pipelines: stage-specific sound and material changes can explain progress without filling the screen with particles.
- Protocol teaching: preserve readable endpoints while using loss of shape to indicate an opaque intermediate representation.
- Product identities: a small procedural field can provide a distinctive mark when the headline and navigation remain stable.

Start with the story and a static diagram. Define the event table next. Add distortion only where it communicates a transition, and sound only where it confirms one. Make every still frame useful. The most transferable feature is the shared timeline, not any particular noise function.

## References

- [Live page](https://opentunnel.xyz/) and [public repository linked by the page](https://github.com/anomalyco/opentunnel).
- [Inspected JavaScript bundle](https://opentunnel.xyz/assets/index-9HwwIM3q.js): header fragment program, relay timestamp field, membrane program, packet sprites, and Web Audio graph. Hashed URLs may change.
- [Inspected CSS](https://opentunnel.xyz/assets/index-B7yIHLdu.css): framing, typography, responsive diagram layers.
- [GitHub Node ignore template](https://github.com/github/gitignore/blob/main/Node.gitignore), used to review source versus generated files.

Verification results and the corresponding Engram note are recorded in the README after implementation.
