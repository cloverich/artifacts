# Clip Path

A standalone amber terminal experiment exploring notched CSS silhouettes, scanline text, ASCII decoration, and a glitching audit narrative. It preserves the original crosshair cursor, eye, eight log entries, assimilation result and purge/reset behavior, with a fixed panel whose log scrolls internally.

Open `clip_path.html` directly in a browser. No build, package install or server is required. The existing Google Fonts link is optional; local monospace fallbacks work offline. For the collection's published Markdown reader, follow **Style notes**; the source is [analysis.md](analysis.md).

**Controls:** Assimilate or Purge changes the fictional terminal state. Restart cancels pending work and starts a fresh audit. The log accepts keyboard focus for scrolling. Motion Off freezes decorative effects; system reduced motion disables them automatically and immediately shows the initial log. Sound starts off; enable it for quiet synthesized action/result cues. No state is saved or transmitted.

The user attributes the original styling partly to [Strange Machine](https://strangemachine.tv/) and partly to remembered cyberpunk imagery; the exact original page was not retained. The new ASCII decoration responds to [Neuromancer](https://plasticlabs.ai/neuromancer)'s print-like image treatment. This is an independent study without affiliation or endorsement.

The existing source/ASCII eye is inherited from this collection. New ASCII ornaments and synthesized sound waveforms are original, using [Soundscape](../soundscape/README.md)'s short-envelope, opt-in feedback principles. No reference image, audio sample, font binary, or third-party source is copied. See [the full provenance and reusable styling breakdown](analysis.md).

Validation from the repository root:

```sh
node --test clip_path/mechanics.test.mjs
```

Five focused production-script checks cover startup, interrupted/repeated actions, automatic restart, and reduced motion. Browser layout and interaction checks are handled with the collection's integration validation. No generated output is required; existing repository ignore rules cover local dependencies, caches, captures, and test output.
