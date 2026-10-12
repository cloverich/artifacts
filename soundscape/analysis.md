---
tags:
  - sound-design
  - web-audio
  - fui
  - design
  - llm
---

# Soundscape — CALDERA instrument study

Inspected 12 October 2026. Continues the [Sci-fi dashboard design study](/notes/03h0kkmcqjugilgupkkumdjke) and [CALDERA prompts](/notes/03h0kl29g6blj8vg9z8y6dbvq). Related notes: [[03h0kkmcqjugilgupkkumdjke]], [[03h0kl29g6blj8vg9z8y6dbvq]].

## Intent and design evidence

Explore whether short, consistent sounds help an operator understand focus, selection, state changes, work in progress, completion, and rejection. Use an original simulated CALDERA survey console rather than reproducing the reference's race data or terrain. Emphasize instruments: station selector, progress ring, linked profile, sensor thresholds, relay switch, event log, command field, and cue scope.

The rendered [Diagonale des Fous / MODALE dashboard](https://beastydesign.github.io/scifi/) was inspected in the browser. Observed: luminous terrain, stacked framed panels in the available narrow viewport, fine mono labels, white/amber charts, changing replay readouts, and an orbiting view. The earlier full study establishes the native HTML/CSS/Canvas/WebGL implementation at source snapshot c0aa4cc53664d775508d1e1ccb2f985eb1179289. Attempts to refetch that snapshot's CSS and main.js returned 404 during this session; those historical implementation facts are attributed to the prior study, not newly verified source. No reference code, images, font, terrain, route data, or textures are copied into this artifact.

Transferable idioms: opposing corner brackets, labeled instruments, restrained semantic amber, linked selection across instruments, a shared clock, and clear replay/simulation labels. Improve readability with larger text, stable numerals, keyboard-operable HTML controls, explicit motion pause, reduced-motion support, and sound opt-in.

## Foley evidence and provenance

Read [Foley's agent guide](https://usefoley.dev/agents.md), [official docs](https://usefoley.dev/docs.html), and the official repository's source and [MIT license](https://github.com/eakbulut/foley/blob/bd31fd931b849fdc6c14c01ed2b78d0020a33720/LICENSE). Inspected upstream snapshot: bd31fd931b849fdc6c14c01ed2b78d0020a33720.

Foley synthesizes 28 cues with Web Audio, grouped into pointer, press, toggle, feedback, notify, motion, and state families. The agent guide recommends declarative binding, one-time unlock, mute, and using synthesis rather than loading files for an ordinary Foley integration. The user explicitly requests integrating their downloaded exports, so this experiment intentionally implements a sprite player instead. It does not pretend to be Foley's bind()/observe() runtime.

The supplied filenames identify the mechanical theme and -8st; Foley calls the pitch setting transpose, measured in semitones. Mechanical shortens/drys transients per docs. The original download settings were not independently recorded, so exact provenance of the chosen character is user report plus filenames. All supplied WAVs are 44.1 kHz, 16-bit stereo PCM. The ZIP duplicates the individual files. The supplied foley-sprite.json is an offset map, not audio.

Local metadata inspection found differences between map durations and actual files (chime: 0.4505 vs 0.390340 s; success: 0.3726 vs 0.378481 s). Cause unknown; separate exports/settings/version could account for it. Never apply an offset map to a different concatenation without checking. Rebuild sample-accurate offsets from the actual files in supplied cue order, with 50 ms silent gutters, and preserve samples without normalizing or transposing again.

## License interpretation and asset handling

Official Foley documentation and repository declare MIT, with no separate paid sound-pack EULA found in the inspected sources. These cues are synthesized by that software, rather than recordings from an unidentified commercial library. The supported working interpretation is to use and redistribute these Foley exports with the upstream copyright/permission notice retained. Include the full MIT notice in the repository and standalone artifact. This is source-based license research, not confirmation of unrelated paid packs.

The user's pasted license clauses are not identified as Foley terms. Do not silently import those restrictions into Foley. For another pack, inspect that pack's actual license, including sample/demo rights, seat/project coverage, web use, and redistribution terms. An audio sprite, base64 embedding, WASM, or a binary blob remains extractable. None automatically grants permission or proves legal synchronization. “Synchronized” is a license term about incorporation into a project, not a technical consequence of obscuring bytes.

Keep one canonical lossless sprite as an intentional binary asset in Git LFS. Ignore the ZIP and raw export folder, preserving the user's local inputs. Keep original map as small provenance metadata, and track newly generated exact map/checksums. The canonical sprite supports rebuilding without the ignored originals. Do not commit reproducible HTML bundles, captures, temporary source downloads, or machine metadata. No publication is requested; work remains local.

## Audio path and tradeoffs

Input → semantic UI event → mode/category policy → cooldown/voice budget → new AudioBufferSourceNode reading an offset/duration from one shared decoded buffer → short edge envelope → optional StereoPannerNode → master GainNode → compressor → analyser → destination.

Decode the complete embedded WAV once after explicit sound enable, retain one AudioContext, reuse the buffer, and create a fresh lightweight source for each one-shot. Start slices with start(when, offset, duration); offsets and duration are seconds ([MDN start()](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start)). Retire and disconnect voices on end. Apply small fade edges, cap concurrent voices, throttle repetitive feedback, and keep master volume modest because exports are normalized close to full scale. A compressor reduces peaks; it is not a guarantee of hearing safety or a true hard ceiling. Disable audio before unlock and while hidden; stop active voices on mute/background. Cancel task loops and timers deliberately.

One combined sprite reduces asset/decoder orchestration and permits one local bundle. It also forces whole-buffer decode and includes unused cues. Lossless PCM is reliable and avoids codec boundary ambiguity, but larger than compressed delivery. Base64 adds roughly one third to stored bytes. This tiny corpus makes that tradeoff practical, not a benchmark claim. Individual buffers with lazy loading suit a much larger library. Foley synthesis would be the simplest/smallest production path for these exact built-in cues; measured load/CPU/cue fidelity comparisons remain future work.

## What the artifact should expose

Three feedback densities: silent, essential (meaningful result/state), and full (focus, clicks, controls, transitions as well). Separate audition from the policy so all 28 supplied cues can be inspected even in silent UI mode once sound is enabled. Show last cue, waveform, sprite segment, decode time and decoded memory. Distinguish the measured decode duration from device output latency; a successful scheduled Web Audio call is not a listening test. Optional screen-position stereo placement lets the user compare a shared center with modest localization.

Keep the same operation understandable without audio. Visual state/log/status messages carry every result. Keyboard focus can give the same gentle cue as pointer hover. Do not sound every frame or every telemetry update. Task completion gets a result sound; busy sounds stop before completion. No ambient soundtrack. Reduced motion does not imply a sound preference.

## Sources

- https://beastydesign.github.io/scifi/
- https://github.com/beastydesign/scifi/commit/c0aa4cc53664d775508d1e1ccb2f985eb1179289 (historical snapshot; raw source unavailable in this session)
- https://usefoley.dev/agents.md
- https://usefoley.dev/docs.html
- https://github.com/eakbulut/foley/tree/bd31fd931b849fdc6c14c01ed2b78d0020a33720
- https://github.com/eakbulut/foley/blob/bd31fd931b849fdc6c14c01ed2b78d0020a33720/LICENSE
- https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start
- https://github.com/github/gitignore/blob/main/Node.gitignore

## Implementation and verification

Engram note ID: `03h1ehvd7d7nrjuw4pitlwqbs`.

Built in `/Users/cloverich/code/artifacts/soundscape`. Run `npm run build` there, then open `dist/soundscape.html`. Node 20+, no install/runtime dependencies. HTTP preview: `node preview.mjs`, http://127.0.0.1:4176; only the bundled HTML is served. Rebuilds need a preview restart. The canonical LFS sprite is enough to build on a fresh clone; `npm run pack-audio` is optional and requires the ignored original exports.

Implemented an original eight-panel CALDERA console with a synthetic 2D transect, mission ring, linked stations/sensors, a 3.2-second sampling task, cancel/reset, relay rejection/reconnect, fault injection, threshold alerts, command validation, and a bounded event log. Silent / Essential / Full compare sound density while keeping the same visible outcomes. All 28 exported cues can be auditioned independently of density while enabled. Scope displays the real decoded waveform, exact slice range, cue category/pan, decode duration, memory, and play count. This approximation omits the reference's 3D terrain, globe, GPX and race replay.

Sprite: 1,409,324 bytes; 7.989 s including 50 ms gutters after all 28 cues. PCM bytes preserved; exact sample offsets regenerated. Standalone HTML about 1.85 MiB because it embeds base64 PCM plus all source and license material. No lazy fetching, re-transposition, or re-normalization. Quiet default gain, edge fades, compressor, per-cue/focus cooldown, six voices maximum, explicit opt-in/mute, keyboard feedback, and background cancellation. Reduced motion disables transitions/cue cursor motion without silently setting a sound preference.

**Actual checks:** `npm test` passes nine focused tests: manifest hash/ranges/gutters, per-slice reconstruction of all original WAV SHA-256 hashes, packing, invalid WAV/pointer rejection, audio unlock/decode reuse, feedback modes/audition/mute, exact source scheduling for all 28 cues, cooldown/voice eviction, and hidden/suspended playback gating. Build validates hash/ranges and JS syntax.

Browser inspection used the bundled HTML via localhost. Confirmed audio unlock/single decode, all 28 auditions selecting the expected cue, one sample completing to 20% with complete cue, station selection, cancellation, offline denied cue/reconnection, thermal threshold crossings via keyboard controls, unknown-command error, silent mode suppressing UI cues while auditions work, and mute suppressing auditions. Checked desktop and 390/320 px responsive layouts, with no clipped elements or browser warnings/errors observed. A status/progress mismatch revealed during inspection was corrected: changing station now sets that station's progress, and reconnecting clears stale blocked text. Identical progress live-region messages are no longer rewritten every tick.

**Limits:** direct file:// verification was blocked by browser URL policy. Local HTTP testing does not establish direct-file playback. No listening test, audible latency benchmark, other browser/mobile-device verification, or real OS background-lifecycle test was performed. Hidden gating is unit-tested. A single browser decode took 21.3 ms, producing a 2.93 MiB float buffer; device/browser dependent.

**Preservation review:** original generated UI/code; no copied dashboard assets/code/fonts/data, secrets, cookies, network telemetry, or private media. Foley's full MIT notice is retained. Canonical WAV is an intentional binary asset covered by repository LFS rules; local hooks/config initialized and pointer tracking checked. ZIP, duplicate individual WAVs, dist builds, screenshots and OS metadata stay ignored. User inputs remain on disk. Only this study is committed; unrelated exploded-atlas edits are untouched. No push/deployment is performed.
