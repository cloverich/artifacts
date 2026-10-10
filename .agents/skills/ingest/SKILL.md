---
name: ingest
description: Dissect one or more supplied URLs into an evidence-based technical and design study, save an Engram note, and build a local educational artifact that exposes the mechanics, idioms, tradeoffs, and useful alternatives. Use for ingesting a reference into this artifacts collection, rather than ordinary link summarization or a production website request.
---

# Ingest

Turn a supplied URL or related set of URLs into a study the user can revisit: source-backed research in Engram and an original local artifact that makes the interesting mechanics inspectable. The Oxide header and OpenTunnel studies in this repository illustrate the intended depth; read them only when useful for the current reference.

## Establish the subject

Open the supplied URLs and identify what deserves dissection: interaction, animation, rendering, sound, layout, typography, data flow, or an engineering technique. Use the user's emphasis when provided; otherwise choose the most distinctive behavior. Related URLs can form one comparative study. Keep unrelated subjects in separate experiment directories.

Check the repository instructions and existing experiments. Search Engram for the subject and read relevant full notes, including any note the user supplies. Reuse an existing study when continuing it; avoid duplicate notes or overwriting unrelated work.

## Dissect with evidence

Inspect the rendered experience and its behavior, then the public implementation where accessible: HTML, CSS, scripts, shaders, asset metadata, linked repositories, and authoritative documentation. Observe transitions over time, input responses, responsive behavior, and pause/reduced-motion behavior when relevant. Distinguish decorative layers from readable content and controls.

Explain the path from input or clock to representation to output. For example, separate scene scheduling, geometric fields, rasterization, compositing, and audio synthesis rather than attributing everything to a shader. Describe concrete algorithms and material parameters where they explain the result. Identify libraries or asset types only when the evidence supports them.

Clearly distinguish:

- Observed behavior in the browser.
- Implementation facts established from inspected source.
- Inferences, approximations, and details that remain unknown.

Source inspection is not a listening test, a performance measurement, or proof of a product's security claims. Cite the inspected URLs and inspection date; flag unstable hashed asset links. Keep source downloads and temporary captures out of commits unless an intentional asset is needed.

Cover transferable idioms and best practices, plus alternatives where they illuminate a real choice. Compare complexity, scale, fidelity, accessibility, dependencies, and runtime cost. For example, Canvas 2D may simplify a small diagram while WebGL is appropriate for a dense per-pixel field. Do not claim an alternative is faster without a relevant measurement; state the conditions under which it may be preferable. Consult primary documentation for uncertain technical claims.

If a page or inspection method is blocked, use permitted evidence that remains available and state the limit. Never present the local approximation as the original implementation.

## Save the Engram study

Post the research using the available Engram tools before building the artifact. Use the existing study's journal when continuing it; otherwise use the `engram` journal unless the user specifies another. Find journals and repositories through the tools instead of guessing IDs.

Write a coherent note covering the distinctive behavior, layer/algorithm breakdown, technical decisions, reusable idioms, meaningful alternatives, sources, and uncertainties. Put useful tags in YAML frontmatter. Link related notes with `[[note-id]]` and retain the returned note ID.

After implementation, update the note with the artifact's location, run/build instructions, differences from the reference, and actual verification results. For a registered repository, add code links pinned to the implementation commit, such as `/code/artifacts@<sha>/<path>`. Read the full note before editing it and preserve unrelated content. If Engram is unavailable, keep the research as a local Markdown draft and explicitly report that posting remains incomplete.

## Build an explanatory artifact

Attempt a focused original implementation in a short, descriptive experiment directory. Preserve the essential mechanics while choosing a practical local architecture. The artifact should teach, not merely resemble the reference: expose important layers, intermediate representations, parameters, or event phases. Use controls and concise explanations that connect a change to its effect. Include alternatives or simplified versions when a side-by-side comparison would make the tradeoff clear. Do not add toggles that reveal nothing useful.

Prefer a dependency-free browser artifact when it suits the subject. Use Go or Node for tooling. Keep readable source modules when helpful, but provide a self-contained HTML build that opens directly from disk without a server. Inline its runtime code, styles, and required assets; embed the explanatory material needed for standalone review. External reference links may remain optional. Prefer Node built-ins for simple packaging; use a maintained bundler if module or asset complexity warrants it. Do not introduce a server solely to load local JavaScript modules.

Use original code and intentional assets. Document where the approximation differs from the inspected implementation, such as replacing a timestamp texture with an analytic wake or a ray marcher with projected shapes. For motion or sound, provide user controls, respect reduced motion where relevant, and keep scrubbing, backgrounding, and pause behavior deliberate. Start sound after an explicit user gesture.

Give the project a short README explaining its intent, source entry points, how to build/open it, and verification limits. Keep a local `analysis.md` with the substantive research and the Engram note ID. If a meaningful reconstruction is infeasible, retain the research and explain the concrete limitation; build a smaller mechanism study when that still serves the subject.

## Verify and preserve

Run checks appropriate to the mechanics: validate the built HTML/script, confirm runtime assets are bundled, inspect representative states and narrow layouts, and exercise meaningful controls. Check timing, wraparound, seeking, and muting for event-driven work. Use focused tests for algorithms or sequencing with a real failure risk. Record what was actually tested.

Attempt browser verification of the standalone file when permitted. If the browser tool blocks `file://`, report that boundary and complete static/bundle checks; do not bypass the browser policy or imply direct-file playback was verified. A temporary HTTP preview can verify ordinary source behavior when permitted, but is not a substitute for claiming a direct-file test.

Review `.gitignore` for each new experiment/toolchain using GitHub's templates as a baseline. Track source, intentional assets, configuration, and lockfiles; ignore reproducible bundles/build output, dependencies, caches, secrets, temporary research, and QA captures. Build the ignored standalone artifact locally so it exists for handoff.

Commit reviewable milestones as the work progresses, following repository and session instructions. Review status and staged diffs before committing; include only this study's changes. Update the note and README to point to the committed implementation.

Finish with a link to the ready-to-open local artifact, the research/README, the Engram note ID or usable link, and a concise account of verification and material limitations. Report incomplete work plainly rather than presenting an attempted reconstruction or draft note as finished.
