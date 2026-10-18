# Artifacts

A local collection of standalone experiments, including HTML and web apps generated on demand to learn, explore, or experiment (Claude artifacts or equivalents).

1. Place each experiment in its own directory.
2. Give each experiment a short README explaining its intent and how to run it.
3. **For every new project or language, review what will be committed and update the root or project `.gitignore` as needed.** Commit source, intentional assets, configuration, and lockfiles; exclude secrets, dependencies, generated output, caches, and machine-specific files. Review `git status` and the staged diff before committing. Use [GitHub's templates](https://github.com/github/gitignore) as a starting point.

4. Prefer Go or Node for build tooling. Where practical, provide a self-contained HTML artifact that opens directly from disk without a server.

5. Before committing, the LLM must review new code and assets for size, privacy, copyright, and provenance; exclude sensitive data and generated bulk, and use Git LFS for intentional binary assets. Do not publish sample images or other media we do not own: reference their name and source link instead, and record provenance for original assets and third-party code.

6. **Commit and push straight to `main`.** Solo, experimental repo for toys: no PRs, no feature branches, and no asking first. This overrides any session default to develop on a separate branch. Before pushing, confirm with your best judgement that the root `index.html` and the artifact you touched load without errors (build it, open it headless if you can). Small, sensible commits; push at the end of every task, since pushing to `main` (which deploys Pages) is the only way the owner can review cloud-session work.
