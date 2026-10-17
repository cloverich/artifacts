import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml, renderMarkdown } from './markdown.mjs';

export const studies = [
  { slug: 'horizon-plate', source: 'horizon-plate/analysis.md', experiment: 'horizon-plate/dist/horizon-plate.html' },
  { slug: 'steward', source: 'steward-dashboard/analysis.md', experiment: 'steward-dashboard/dist/steward.html' },
  { slug: 'soundscape', source: 'soundscape/analysis.md', experiment: 'soundscape/dist/soundscape.html' },
  { slug: 'exploded-atlas', source: 'exploded-atlas/analysis.md', experiment: 'exploded-atlas/dist/exploded-atlas.html' },
  { slug: 'motion-accent', source: 'motion-accent-lab/analysis.md', experiment: 'motion-accent-lab/dist/motion-accent.html' },
  { slug: 'tunnel-signal', source: 'opentunnel-lab/analysis.md', experiment: 'opentunnel-lab/dist/tunnel-signal.html' },
  { slug: 'oxide', source: 'oxide-header-lab/analysis.md', experiment: 'oxide-header-lab/index.html' },
  { slug: 'clip-path', source: 'clip_path/analysis.md', experiment: 'clip_path/clip_path.html' },
  { slug: 'neuromancer-hermes', source: 'docs/neuromancer-hermes.md', experiment: 'index.html' },
  { slug: 'signal-press', source: 'signal-press/analysis.md', experiment: 'signal-press/index.html' },
];
const repository = 'https://github.com/cloverich/artifacts';

export function noteLink(href, source) {
  if (href.startsWith('/notes/')) return null; // Private notebook IDs remain readable labels.
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('//') || href.startsWith('#')) return href;
  const historical = href.match(/^\/code\/artifacts@([a-f\d]+)(?:\/(.*))?$/);
  if (historical) return `${repository}/${historical[2] ? 'blob' : 'tree'}/${historical[1]}${historical[2] ? '/' + historical[2] : ''}`;
  if (href.startsWith('/')) return null;
  const [, file, suffix = ''] = href.match(/^([^?#]*)(.*)$/);
  const path = posix.normalize(posix.join(posix.dirname(source), file));
  const study = studies.find(item => item.source === path);
  if (study) return `${study.slug}.html${suffix}`;
  if (studies.some(item => item.experiment === path)) return `../${path}${suffix}`;
  if (path.startsWith('../')) return null;
  return `${repository}/blob/main/${path}${suffix}`;
}

const style = `
:root { color-scheme:light dark; --paper:#f7f5ed; --ink:#292b23; --muted:#626458; --rule:#d1d2c4; --accent:#4a5f2b; --wash:#eeeee3; }
* { box-sizing:border-box; }
body { margin:0; background:var(--paper); color:var(--ink); font:17px/1.75 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
main { width:min(100% - 3rem,76ch); margin:0 auto; padding:2.5rem 0 5rem; }
nav { display:flex; flex-wrap:wrap; gap:.65rem 1.25rem; padding-bottom:1.3rem; margin-bottom:2rem; border-bottom:1px solid var(--rule); font: .8rem/1.5 ui-monospace,monospace; }
.appearance { display:flex; flex-wrap:wrap; gap:.65rem; color:var(--muted); }
.appearance label { display:inline-flex; align-items:center; gap:.2rem; cursor:pointer; }
.appearance input { margin:0; accent-color:var(--accent); }
a { color:var(--accent); text-underline-offset:.18em; overflow-wrap:anywhere; }
a:hover { text-decoration-thickness:2px; }
a:focus-visible,.table-scroll:focus-visible { outline:2px solid var(--accent); outline-offset:4px; }
h1,h2,h3,h4,h5,h6 { line-height:1.2; font-weight:650; letter-spacing:-.025em; scroll-margin-top:1rem; }
h1 { font-size:clamp(1.9rem,5vw,2.65rem); margin:0 0 1.3rem; }
h2 { font-size:1.55rem; margin:2.8rem 0 1rem; padding-top:1.3rem; border-top:1px solid var(--rule); }
h3 { font-size:1.2rem; margin-top:2rem; }
p,ul,ol { margin:1rem 0; }
li { margin:.45rem 0; }
li>p { margin:.3rem 0; }
ul,ol { padding-left:1.5rem; }
code { font:.86em/1.6 ui-monospace,SFMono-Regular,Consolas,monospace; background:var(--wash); padding:.13em .3em; border-radius:3px; overflow-wrap:anywhere; }
pre { background:var(--wash); border:1px solid var(--rule); padding:1rem 1.2rem; overflow:auto; line-height:1.6; }
pre code { padding:0; overflow-wrap:normal; }
blockquote { margin:1.4rem 0; border-left:3px solid var(--accent); padding:.1rem 1.3rem; color:var(--muted); }
.table-scroll { overflow-x:auto; max-width:100%; margin:1.5rem 0; }
table { width:100%; border-collapse:collapse; font-size:.88em; line-height:1.6; }
th,td { text-align:left; vertical-align:top; padding:.7rem .8rem; border-bottom:1px solid var(--rule); min-width:9rem; }
th { background:var(--wash); }
hr { border:0; border-top:1px solid var(--rule); margin:2rem 0; }
footer { border-top:1px solid var(--rule); margin-top:3rem; padding-top:1rem; color:var(--muted); font-size:.8rem; }
@media(prefers-color-scheme:dark) { :root { --paper:#171a15; --ink:#e7e8de; --muted:#b4b8a6; --rule:#3f4737; --accent:#bbd28f; --wash:#252b21; } }
body:has(#theme-light:checked) { color-scheme:light; --paper:#f7f5ed; --ink:#292b23; --muted:#626458; --rule:#d1d2c4; --accent:#4a5f2b; --wash:#eeeee3; }
body:has(#theme-dark:checked) { color-scheme:dark; --paper:#171a15; --ink:#e7e8de; --muted:#b4b8a6; --rule:#3f4737; --accent:#bbd28f; --wash:#252b21; }
@media(max-width:480px) { body { font-size:16px; } main { width:calc(100% - 2rem); padding-top:1.5rem; } th,td { padding:.6rem; } }
@media print { body { background:white; color:black; font-size:11pt; } main { width:100%; padding:0; } nav,footer { display:none; } .table-scroll,pre { overflow:visible; } a { color:inherit; } }
`;

export function notePage(markdown, study) {
  const title = markdown.replace(/^---\n[\s\S]*?\n---\n/, '').match(/^#\s+(.+)$/m)?.[1] || study.slug;
  const body = renderMarkdown(markdown, { resolveLink: href => noteLink(href, study.source) });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="description" content="Styling vocabulary, mechanics, evidence, and reusable design notes from the Artifacts reference library."><title>${escapeHtml(title)} · Styling notes</title><style>${style}</style></head>
<body><main><nav aria-label="Study navigation"><a href="../index.html">← Collection</a><a href="../${escapeHtml(study.experiment)}">Experiment</a><a href="${study.slug}.md">Raw Markdown</a><a href="${repository}/blob/main/${study.source}">Source</a><div class="appearance" role="group" aria-label="Appearance"><label><input id="theme-auto" type="radio" name="theme" checked>Auto</label><label><input id="theme-light" type="radio" name="theme">Light</label><label><input id="theme-dark" type="radio" name="theme">Dark</label></div></nav><article>${body}</article><footer>Artifacts · A personal reference library. Independent studies; no affiliation with the inspirations. Private notebook references are preserved as text.</footer></main></body></html>\n`;
}

export async function buildNotes(root = fileURLToPath(new URL('../', import.meta.url))) {
  await mkdir(resolve(root, 'notes'), { recursive: true });
  for (const study of studies) {
    const markdown = await readFile(resolve(root, study.source), 'utf8');
    await writeFile(resolve(root, `notes/${study.slug}.html`), notePage(markdown, study));
    await writeFile(resolve(root, `notes/${study.slug}.md`), markdown);
  }
  console.log(`Rendered ${studies.length} full styling studies with raw Markdown companions.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildNotes();
