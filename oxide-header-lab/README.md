# Oxide header lab

A local dissection of Oxide's editorial and animated blog headers, with six original ASCII experiments and fictional Hacker News style headlines. See [analysis.md](analysis.md) for observed structures, source links, implementation details, and differences from the originals.

## Run

Open `index.html` directly in a browser; no installation, network, or build required. Alternatively, from this directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Visit http://127.0.0.1:8765. Choose a study, switch to the static editorial layout, pause/play, reseed, or toggle individual layers. OS reduced-motion preferences start the demo paused. Offscreen and background tabs stop advancing the simulation.

Files: `index.html` (structure), `style.css` (layout), `app.js` (original drawing programs), `analysis.md` (research). No Oxide assets, fonts, or JavaScript are vendored. Source is intentionally tracked; the project `.gitignore` excludes preview screenshots and state. Root ignore rules already cover secrets, caches, dependencies, and generated output. Included in the fresh source snapshot after the collection history reset.

## Verification

Checked all six selectors, pause stability, grid visibility, and the editorial switch in the browser. Verified 144×24 / 72×24 fields, complete row height, and no horizontal overflow at 1440px and 320px. Browser error log was empty; `node --check app.js` and `git diff --check` passed.

Engram note ID: `03h0ows39tjg4jgn8t78y3kae` in the `engram` journal.
