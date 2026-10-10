# Tunnel / signal lab

A local study of OpenTunnel's printed shader texture and event-driven diagram sound, following the earlier Oxide header lab. Original implementation; no copied fonts, shaders, recordings, or product assets. Read [analysis.md](analysis.md) for the source dissection and differences.

## Run

From this directory, build with Node (22+):

```sh
node build.mjs
```

Open `dist/tunnel-signal.html` directly in a browser, or double-click it. It includes the CSS, JavaScript, shaders, and research text and can be moved elsewhere for offline review. No server, dependencies, or installation are needed. Sound requires an explicit click. The controls let you pause, scrub the shared timeline, isolate rendering layers, and adjust the printed field. Reduced motion starts paused; background and offscreen views suspend advancement and sound.

The separate source files remain readable and editable. Re-run `node build.mjs` after edits. The builder uses Node built-ins, combines named declarations in dependency order, validates the JavaScript, and emits a classic inline script after the HTML. It is a project-specific packager, not a general ES module bundler.

Source, documentation, and configuration are tracked. Generated `dist/` output, screenshots, and temporary research downloads are ignored. The root `.gitignore` already covers dependencies, caches, build output, logs, and secrets; project rules were reviewed against GitHub's Node template.

Research date: 9 October 2026. Reference note: Oxide `03h0ows39tjg4jgn8t78y3kae`.

Engram note: `03h0qdk6jytoqocz953ouhw2e` — **OpenTunnel: printed fields and a small sonic machine**, in the `engram` journal. It links back to the Oxide study and to the committed implementation.

## Verification

Both WebGL2 programs compiled in the local browser; all three surface modes and four layer switches worked. Checked pause stability, silent seeking, and route changes. Web Audio resumed after the sound click, emitted transition events, and produced nonzero analyser output; paused output measured zero with no extra events during seeking. This verifies the graph and transport, not a listening comparison against the original.

Desktop (1280px) and mobile (375px and 320px) had no horizontal overflow. Mobile annotations use larger SVG text. Browser warnings/errors were empty. JavaScript syntax checks and `git diff --check` passed. The event test covers uniqueness across two loops at normal/double speed, wraparound, skipped-time suppression, and relay depth. Run it with `node timeline.test.mjs` (Node 22+). It has no dependencies.

Review capture: `screenshots/review.jpg` (local, ignored). For later review, open the standalone HTML above; no preview server is required.
