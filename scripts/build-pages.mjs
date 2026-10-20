// Curated publication: never copy the repository or a project's entire directory.
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildNotes, studies } from './build-notes.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '_site');
const run = (command, args, directory = '.') => {
  const result = spawnSync(command, args, { cwd: resolve(root, directory), stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed in ${directory}`);
};
for (const project of ['exploded-atlas', 'horizon-plate', 'iso-glow-lab', 'motion-accent-lab', 'opentunnel-lab', 'reader-presence-lab', 'soundscape', 'steward-dashboard']) {
  run(process.execPath, ['build.mjs'], project);
}
await buildNotes(root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of [
  'index.html',
  'clip_path/clip_path.html',
  'oxide-header-lab/index.html', 'oxide-header-lab/style.css',
  'oxide-header-lab/app.js', 'oxide-header-lab/analysis.md',
  'exploded-atlas/dist/exploded-atlas.html',
  'horizon-plate/dist/horizon-plate.html',
  'iso-glow-lab/dist/iso-glow.html',
  'motion-accent-lab/dist/motion-accent.html',
  'opentunnel-lab/dist/tunnel-signal.html',
  'reader-presence-lab/dist/reader-presence.html',
  'soundscape/dist/soundscape.html',
  'steward-dashboard/dist/steward.html',
  'signal-press/index.html', 'signal-press/specimen.svg',
  'validate_opml/README.md',
  ...studies.flatMap(study => [`notes/${study.slug}.html`, `notes/${study.slug}.md`]),
]) {
  const destination = resolve(output, path);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(root, path), destination, { recursive: true });
}
await writeFile(resolve(output, '.nojekyll'), '');

// Catch missing internal links/assets before upload, including repository-subpath mistakes.
let total = 0;
const files = [];
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink in publication: ${path}`);
    if (entry.isDirectory()) { await inspect(path); continue; }
    const bytes = (await stat(path)).size;
    total += bytes;
    files.push({ path: path.slice(output.length + 1), bytes });
    if (entry.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      for (const [, href] of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) continue;
        if (href.startsWith('/')) throw new Error(`Root-relative URL in ${path}: ${href}`);
        const target = resolve(dirname(path), decodeURIComponent(href.split(/[?#]/)[0]));
        if (!target.startsWith(output + '/')) throw new Error(`URL escapes publication: ${href}`);
        await stat(target);
      }
    }
  }
}
await inspect(output);
if (total >= 1_000_000_000) throw new Error('Publication exceeds GitHub Pages 1 GB limit');
console.log(`\nPages output: ${files.length} files, ${(total / 1024).toFixed(1)} KiB`);
console.table(files.sort((a, b) => b.bytes - a.bytes).slice(0, 10));
