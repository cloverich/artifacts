# Clip Path — an amber archive terminal

A style vocabulary and implementation recipe for the [live experiment](clip_path.html). Expanded 16 October 2026. This is an independent experiment, with no affiliation or endorsement from its references.

## What this experiment studies

A small fictional terminal asks whether to assimilate a commodified version of cyberpunk or purge it. The original eight audit entries, amber palette, clipped panel, crosshair cursor, scanline texture, ASCII eye, assimilation glitch, and purge/restart narrative are retained. The expansion adds a stable scrollable viewport, quiet background ornaments, explicit motion and sound controls, keyboard controls, and safe cancellation of interrupted sequences.

The user identifies **Strange Machine** as an influence on the original styling, alongside their memory of cyberpunk imagery. The public [Strange Machine site](https://strangemachine.tv/) and its [Safe Space / Brain Box](https://strangemachine.tv/safespace/) page were located. The exact original reference page was not recorded in the inherited source or repository history; the link establishes the named reference rather than proving a precise visual correspondence. Do not describe this page as a faithful reconstruction of a specific Strange Machine screen.

The new background decoration responds to the user's appreciation of the image treatment in [Plastic Labs' Neuromancer](https://plasticlabs.ai/neuromancer): a graphic can appear to be made from a print or terminal substrate instead of sitting above it as a glossy illustration. Here that idea becomes a tiny original ASCII field, retaining the existing amber terminal language. No Neuromancer graphic, script, animation sequence, or source code is copied. The separate home-page study covers Neuromancer and [Hermes Agent](https://hermes-agent.nousresearch.com) in more detail; their imagery is not transplanted into this terminal.

## Vocabulary to reuse

| Vocabulary | Visible mechanism | Role |
| --- | --- | --- |
| Notched chassis | One diagonal corner in a CSS polygon; a smaller matching polygon cuts out the interior | Makes a plain rectangle feel manufactured |
| Nested silhouette border | Amber outer element, dark inner element, 2 px inset | Produces a border that follows the cut corner |
| Contour glow | `drop-shadow()` on the clipped wrapper | Glow follows the clipped shape rather than a rectangular box |
| Phosphor monochrome | Amber text, dim amber separators, near-black ground | Restricts the palette while preserving hierarchy |
| Raster scanlines | Fixed repeating linear gradient, dark 1 px stripe followed by transparent space | Gives ordinary HTML text a printed CRT surface |
| Terminal typography | Monospaced labels, taller log type, hexadecimal line prefixes | Separates instrument chrome from narrative output |
| Printed ASCII ornament | Fixed-width text arranged into eye, signal rings and memory sector | Carries atmosphere without an image download |
| Temporal patina | Slow, low-amplitude opacity changes in decorative layers | Suggests a live system without moving the layout |
| Chromatic registration error | Two offset pseudo-elements duplicate completion text, clipped into animated strips | The iconic assimilation glitch |
| Structural hierarchy | Bright silhouette and actions; quieter labels and ornaments | Keeps the operator's task apparent |
| Diegetic status | Audit identifiers, process IDs, halted state and restart | Makes decoration serve the fictional system |
| Event-bound audio | One brief sound for an explicit action or result | Confirms the transition without a continuous soundtrack |

## The construction recipe

### 1. Build the silhouette before adding texture

The outer wrapper supplies the bright fill and `clip-path: polygon(...)`. Its padding becomes the border thickness. The inner wrapper supplies the dark fill and a matching polygon with a small coordinate adjustment. Use a smaller corner cut for the buttons; repeating the same geometry at different scales makes them feel part of one system.

Apply `filter: drop-shadow(...)` to the wrapper. A regular `box-shadow` belongs to a rectangular box and does not naturally trace this diagonal silhouette. Avoid stacking many bright glows: the panel border is already the strongest frame.

### 2. Reserve a stable viewport for the story

The panel height is `min(650px, 100dvh - 104px)` on larger screens and `100dvh - 150px` on narrow screens. The header and action footer do not shrink. The log has `flex: 1`, `min-height: 0`, `overflow-y: auto`, and contained overscroll. The `min-height: 0` is essential: without it, a flex child can insist on its full content height and push the panel larger as messages arrive.

The scrolling region can receive keyboard focus; Page Down and arrow keys can inspect it while the action buttons remain visible. Newly appended log entries follow the bottom only when the reader was already close to it. Purge deliberately follows its own rapid output. Restart moves back to the beginning. This is a persistent terminal panel, so ordinary page semantics are used rather than an ARIA dialog with a focus trap.

### 3. Put texture behind the task

The original ASCII eye remains. Two small additional text ornaments suggest a ringed signal and an engraved memory sector. Their characters are static; the browser only interpolates opacity. A vertical mask softens the upper and lower edges. The ornaments are noninteractive and excluded from the accessibility tree.

The screen texture is one repeating CSS gradient with `pointer-events: none`. It crosses the lettering as well as the background, which is the source of the text's scanline appearance. Keep stripe contrast low enough that glyphs remain readable. Do not turn the whole interface into continuously scrambled characters.

### 4. Keep the completion glitch recognizable

The `ASSIMILATION COMPLETE` text still has its duplicate `::before` and `::after` layers, narrow strip clipping, red/green edge offsets, and the original irregular keyframes. The literal message remains the readable layer. The original brief amber background flash is retained when motion is enabled. Motion Off and system reduced motion suppress the flash and the decorative glitch layers; the completion message still appears immediately.

### 5. Treat timers as a cancellable sequence

Every timeout belongs to one set. Purge, assimilation, and restart clear all pending work before starting their next state. This prevents a stale five-second purge restart from overwriting an assimilation result, and prevents interleaved process lines after restart. Eleven purge lines lead to `SYSTEM HALTED`, followed by the original five-second automatic restart. The initial audit clock finishes after the eighth entry; no decorative JavaScript loop remains running.

A polite status region announces the useful state changes. It does not announce every individual hexadecimal prefix or purge line. All three action controls are native buttons, so Enter and Space work without additional keyboard simulation.

### 6. Use sound as a small confirmation

The [Soundscape experiment](../soundscape/dist/soundscape.html) provides the interaction vocabulary: explicit enablement, quiet gain, short envelopes, semantic result sounds, cancellation, and silence while hidden. Clip Path uses original Web Audio synthesis rather than embedding Soundscape's Foley sample sprite. These sounds share the feedback principles, not the same waveforms.

- Restart / sound enable: one short descending triangle tone.
- Assimilation: two soft sine notes, 65 ms apart, each with a short fade.
- Purge: two low descending triangle notes.

The gain envelope starts at zero, rises over 5 ms, and fades almost to zero before stopping. At most two oscillator voices are created for a cue, and the previous cue is stopped first. Nothing sounds on load or on every log line. Sound is a session-only preference; no storage, microphone, media download, or analytics is involved. The visible result carries the same meaning when sound is off.

## Prompt recipe

> Build a compact amber archive terminal with a stable notched chassis, nested silhouette borders, phosphor monochrome, monospaced hexadecimal labels, and a low-contrast scanline overlay. Place original ASCII eye/signal ornaments behind the panel with soft masked edges and slow opacity changes. Keep the main text steady and the controls visible while the log scrolls. Reserve chromatic strip displacement for the final completion message. Include native buttons, a restart that cancels pending timers, reduced motion, motion pause, and optional short synthesized action/result sounds. Keep the implementation small and make the frozen frame work.

To blend this vocabulary with another reference, replace one layer at a time: silhouette, palette, typography, print substrate, ornament subject, or event choreography. Keeping the stable terminal structure while changing only the ornamental print language usually preserves the directness. Combining every glow, distortion, flicker, and animated graphic at once would obscure it.

## Provenance and preservation

The existing HTML/CSS/JS and ASCII eye are inherited from this collection's original Clip Path experiment. Added ring/memory ornaments, controls, timer management and oscillators are original code/text authored for this expansion. No third-party image, sampled sound, font binary, screenshot, or downloaded reference source is included. Google Fonts serves Share Tech Mono and VT323 through the pre-existing stylesheet link; the interface falls back to local monospace fonts offline. The page makes no data requests besides those font requests.

Only source, Markdown notes and a small Node test are added; no build artifacts, captured browser data, credentials, or binary media. Existing repository ignores cover dependencies and test output. There is no new package or dependency to install. The user permits reference screenshots, but this expansion does not add any.

## Verification

`node --test clip_path/mechanics.test.mjs` passes five focused tests executing the inline production script with a controlled DOM/timer model: eight-entry startup, restart during purge, repeated assimilation after purge, reduced-motion startup, and purge/halt/automatic restart. These checks target the cancellation races introduced by the original independent timers; they do not establish browser rendering or audible quality.

Visual and interactive browser verification is recorded in the collection's final change report. No listening test or device performance benchmark is claimed here. The original source had a minimal README and no recorded exact Strange Machine source URL, so that historical uncertainty remains explicit.

## Integrated browser verification

On October 16, 2026, the HTTP preview verified the original eight logs, crosshair, assimilation glitch state, purge interruption and Restart, and opt-in sound controls. Desktop, 320 × 568, and 844 × 390 viewports keep the actions anchored while the log scrolls inside the fixed panel. At 320 × 568 the panel measures 418px, log viewport 308px, and completed log content approximately 608px. Containing the original eye inside the clipped decoration layer removed a 100px horizontal overflow. Browser listening quality and direct `file://` execution were not verified; production-script checks cover reduced motion and transition cancellation.
