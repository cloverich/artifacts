# Soundscape / CALDERA

A local experiment in sonic UI feedback, built around a simulated volcanic survey console. Instruments link station selection, elevation, sensor thresholds, sample acquisition, relay state, command validation, and an event log. Compare **Silent / Essential / Full** feedback density, audition all 28 supplied cues, and inspect their waveform and sprite timing. Sound requires explicit enable; every outcome also has visual feedback.

Implementation milestone: `e81458c1cbec9904380896a92dfff8e07cee4118` (local commit). Engram study: `03h1ehvd7d7nrjuw4pitlwqbs`; commit-pinned code links are preserved in that note and `analysis.md`.

## Run

Requires Node 20+ for tooling, no package installation or runtime dependencies.

```sh
cd soundscape
git lfs pull
npm run build
open dist/soundscape.html
```

The built HTML embeds its CSS, JavaScript, audio, and license notice. It is designed to open from disk. To preview over HTTP instead, run `node preview.mjs` and open http://127.0.0.1:4176. The preview serves only the built HTML and must be restarted after rebuilding. Nothing is deployed by these commands. The repository's Pages workflow includes this bundle and deploys it on pushes to `main`, at `https://cloverich.github.io/artifacts/soundscape/dist/soundscape.html`.

## What to try

1. Enable sound, acquire a sample, then repeat the workflow in the three feedback modes.
2. Select S03 in the table or on the terrain to inspect its warmer sensors. Essential and Full play selection sounds; Silent and mute remain quiet. Drag the topographic field to orbit, use Ctrl-wheel to zoom, or use its orbit/reset buttons.
3. Disconnect the relay, try acquiring a sample, and reconnect. Test a fault or cancel an acquisition.
4. Type `STATUS`, `SCAN`, `RESET`, or an invalid command. Full mode adds keystroke/focus feedback.
5. Audition the seven cue families. Auditions work independently of feedback density while audio is enabled; mute stops all audio. Compare centered versus screen-position stereo.

Audio defaults to 25% master gain. Volume, density, placement, and motion are local session settings. Reduced motion turns off decorative transitions, terrain sweep, ASCII drift, and cue playback cursors; essential task progress and visual results remain available. Offscreen terrain/header animation stops. Backgrounding cancels an acquisition and stops its cues rather than finishing unseen and replaying stale audio later.

## Source and audio

- `index.html`, `style.css`, `app.js`: readable UI source; index is a **build template**, not the runnable artifact.
- `audio.js`: original Web Audio sprite player; one decode/context, precise slices, edge fades, six-voice budget, cooldowns, compressor, mute/background gating.
- `visuals.js`: original projected point cloud and marching-squares contours in Canvas 2D; station elevations share the profile along the transect. The header adapts our own Rising Contour algorithm into a 144/72-column, 12-row band. One 24 fps loop advances visible visual layers; no WebGL or new dependency is needed.
- `audio/mechanical-8st.wav`: canonical intentional lossless sprite, tracked with Git LFS (1,409,324 bytes). 28 cues, 44.1 kHz / 16-bit / stereo, 50 ms gaps, 7.989 seconds.
- `audio/sprite.json`: exact sample ranges, SHA-256, and format metadata.
- `audio/provenance.json`: hashes of the supplied exports and comparisons against the original map.
- `foley-sprite.json`: original user-supplied metadata, retained for comparison.
- `pack-audio.mjs`, `wav.mjs`: dependency-free Node packaging, preserving every original PCM sample.
- `build.mjs`: checks the canonical sprite hash/ranges and builds ignored `dist/soundscape.html` and `dist/index.html`.
- `analysis.md`: substantive study and Engram note ID `03h1ehvd7d7nrjuw4pitlwqbs`.

The supplied ZIP and individual WAV directory stay **ignored, preserved locally**, because they duplicate the canonical sprite. A fresh clone builds from that LFS sprite without the ZIP. To recreate the sprite from the original download, restore the local `foley-cues-mechanical/` directory and run `npm run pack-audio` then `npm run build`. That command deliberately regenerates the canonical asset and provenance.

## References and license

Visual inspiration: [Diagonale des Fous / MODALE](https://beastydesign.github.io/scifi/), continuing Engram's **Sci-fi dashboard — design vocabulary, technologies, and CALDERA concepts** (`03h0kkmcqjugilgupkkumdjke`) and **CALDERA prompts** (`03h0kl29g6blj8vg9z8y6dbvq`). This original implementation emphasizes 2D instruments. No reference visuals, fonts, code, terrain, route data, or images are copied. Synthetic readings are illustrative, not geological measurements.

The terrain adds a Canvas 2D projection of a synthetic elevation field with point samples, contours, and an amber path; the source reference uses WebGL terrain with geographic data. The ASCII band reuses the original Rising Contour motif from this repository's [Oxide Header Lab](../oxide-header-lab/README.md), inspired by [Oxide's Series D announcement](https://oxide.computer/blog/our-445m-series-d). It combines three sinusoidal frequencies, a rising edge, half-block glyphs, and sparse shading. No Oxide program, font, screenshot, or remote asset is copied.

Audio: supplied by the user from [Foley](https://usefoley.dev/), mechanical theme with **transpose −8 semitones** according to filenames/user settings. Official [docs](https://usefoley.dev/docs.html), [agent guide](https://usefoley.dev/agents.md), and [MIT license](https://github.com/eakbulut/foley/blob/bd31fd931b849fdc6c14c01ed2b78d0020a33720/LICENSE) inspected 12 October 2026. The full upstream copyright and permission notice is in `FOLEY-LICENSE.txt` and embedded in the HTML. No separate export license was found in the inspected official sources; the original download's app version/settings beyond theme/transpose were not independently recorded. The working interpretation is that these synthesized Foley exports are redistributable with that notice. Other paid sound-pack contracts require their own review.

Foley normally synthesizes these cues live; this study intentionally uses the user's exported audio. A production Foley integration could therefore avoid audio assets altogether. **Sprites/base64 remain extractable and do not provide legal license protection.** Packaging alone does not satisfy an unrelated paid library's redistribution restrictions.

## Verification

`npm test` passes 9 focused checks: every original WAV is reconstructed byte-for-byte from its sprite slice (SHA-256), ranges/gutters match, invalid WAVs/LFS pointers are rejected, all cue starts/durations schedule correctly, decode/context reuse works, modes/mute/hidden gating work, and cooldown/voice cleanup stay bounded.

The bundled HTML was exercised in the Codex in-app browser over localhost: audio enable and single decode, all 28 auditions, sample completion, selection, cancel, offline rejection/reconnect, thermal threshold transitions using keyboard controls, command validation, silent mode, mute, and desktop/narrow layouts at 1280, 390, and 320 px. No browser warnings/errors were observed. One decode measured 21.3 ms with a 2.93 MiB buffer on this device; this is not an output-latency benchmark or a listening test.

Direct `file://` browser verification was blocked by the browser's URL policy. The standalone build has no external runtime requests, but direct-file playback and perceived sound quality remain manual verification items. Background audio policy is unit-tested; actual OS/browser background lifecycle was not tested end-to-end. No other browsers or mobile devices were tested.

Follow-up verification (12 October 2026): station changes play `switch` in Essential mode and repeated clicks play `tap`; both stay suppressed in Silent. Selection updates the terrain marker/HUD, profile and sensors. Keyboard orbit and reset controls changed the view and produced cues. The Rising Contour field froze when Motion was switched off. Desktop and 390 px layouts passed visual/overflow checks with no Soundscape console errors/warnings. All 16 collection mechanics checks passed, including the updated nine Soundscape checks, and the curated Pages build passed (13 files, about 2.50 MiB total). Scanground emitted existing browser-database age notices during its otherwise successful build. Publication packages only the standalone Soundscape HTML, retaining Foley's notice; it excludes raw WAV/ZIP inputs and QA captures.
