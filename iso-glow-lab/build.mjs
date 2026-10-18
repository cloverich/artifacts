// Inline mechanics, app, styles, and the study into one self-contained HTML
// file that opens directly from disk without a server or network requests.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Script } from 'node:vm';

const root = new URL('./', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const mechanics = (await read('mechanics.mjs')).replace(/^export /gm, '');
const app = (await read('app.js')).replace(/^import\s*\{[\s\S]*?\}\s*from\s*['"]\.\/mechanics\.mjs['"];\s*/m, '');
const code = `${mechanics}\n${app}`;
new Script(code); // syntax verification

const css = await read('style.css');
const analysis = await read('analysis.md');

const html = (await read('index.html'))
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}</style>`)
  .replace('<script type="module" src="app.js"></script>', () => `<script>\n${code.replaceAll('</script', '<\\/script')}</script>`)
  .replace('<!--RESEARCH-->', () => `<pre class="research">${escape(analysis)}</pre>`);

if (/<(?:script|link)[^>]+(?:src|href)=/i.test(html)) {
  throw new Error('Unbundled runtime asset');
}

await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/iso-glow.html', root), html);

// Also emit a head-less body fragment for Claude/Web artifact embeds.
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const keep = [...head.matchAll(/<title>[\s\S]*?<\/title>|<meta name="description"[^>]*>|<style>[\s\S]*?<\/style>/g)].map(m => m[0]);
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
await writeFile(new URL('dist/artifact.html', root), `${keep.join('\n')}\n${body}`);

console.log(`Built dist/iso-glow.html (${(html.length / 1024).toFixed(1)} KB) and dist/artifact.html; script parses; no external assets.`);
