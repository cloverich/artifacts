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

The built HTML embeds its CSS, JavaScript, audio, and license notice. It is designed to open from disk. To preview over HTTP instead, run `node preview.mjs` and open http://127.0.0.1:4176. The preview serves only the built HTML and must be restarted after rebuilding. Nothing is deployed by these commands.

## What to try

1. Enable sound, acquire a sample, then repeat the workflow in the three feedback modes.
2. Select S03 to inspect its warmer sensors. Move the thermal threshold across the reading.
3. Disconnect the relay, try acquiring a sample, and reconnect. Test a fault or cancel an acquisition.
4. Type `STATUS`, `SCAN`, `RESET`, or an invalid command. Full mode adds keystroke/focus feedback.
5. Audition the seven cue families. Auditions work independently of feedback density while audio is enabled; mute stops all audio. Compare centered versus screen-position stereo.

Audio defaults to 22% master gain. Volume, density, placement, and motion are local session settings. Reduced motion turns off decorative transitions/cue playback cursors; essential task progress and visual results remain available. Backgrounding cancels an acquisition and stops its cues rather than finishing unseen and replaying stale audio later.

## Source and audio

- `index.html`, `style.css`, `app.js`: readable UI source; index is a **build template**, not the runnable artifact.
- `audio.js`: original Web Audio sprite player; one decode/context, precise slices, edge fades, six-voice budget, cooldowns, compressor, mute/background gating.
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

Audio: supplied by the user from [Foley](https://usefoley.dev/), mechanical theme with **transpose −8 semitones** according to filenames/user settings. Official [docs](https://usefoley.dev/docs.html), [agent guide](https://usefoley.dev/agents.md), and [MIT license](https://github.com/eakbulut/foley/blob/bd31fd931b849fdc6c14c01ed2b78d0020a33720/LICENSE) inspected 12 October 2026. The full upstream copyright and permission notice is in `FOLEY-LICENSE.txt` and embedded in the HTML. No separate export license was found in the inspected official sources; the original download's app version/settings beyond theme/transpose were not independently recorded. The working interpretation is that these synthesized Foley exports are redistributable with that notice. Other paid sound-pack contracts require their own review.

Foley normally synthesizes these cues live; this study intentionally uses the user's exported audio. A production Foley integration could therefore avoid audio assets altogether. **Sprites/base64 remain extractable and do not provide legal license protection.** Packaging alone does not satisfy an unrelated paid library's redistribution restrictions.

## Verification

`npm test` passes 9 focused checks: every original WAV is reconstructed byte-for-byte from its sprite slice (SHA-256), ranges/gutters match, invalid WAVs/LFS pointers are rejected, all cue starts/durations schedule correctly, decode/context reuse works, modes/mute/hidden gating work, and cooldown/voice cleanup stay bounded.

The bundled HTML was exercised in the Codex in-app browser over localhost: audio enable and single decode, all 28 auditions, sample completion, selection, cancel, offline rejection/reconnect, thermal threshold transitions using keyboard controls, command validation, silent mode, mute, and desktop/narrow layouts at 1280, 390, and 320 px. No browser warnings/errors were observed. One decode measured 21.3 ms with a 2.93 MiB buffer on this device; this is not an output-latency benchmark or a listening test.

Direct `file://` browser verification was blocked by the browser's URL policy. The standalone build has no external runtime requests, but direct-file playback and perceived sound quality remain manual verification items. Background audio policy is unit-tested; actual OS/browser background lifecycle was not tested end-to-end. No other browsers or mobile devices were tested.
