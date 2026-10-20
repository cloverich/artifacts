// Inline protocol.mjs, app.js, style.css, and rendered analysis.md into one
// self-contained HTML file that opens directly from disk (file://) without a server.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Script } from 'node:vm';
import { renderMarkdown } from '../scripts/markdown.mjs';

const root = new URL('./', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');

const protocol = (await read('protocol.mjs')).replace(/^export /gm, '');
const app = (await read('app.js')).replace(/^import\s*\{[\s\S]*?\}\s*from\s*['"]\.\/protocol\.mjs['"];\s*/m, '');
const code = `${protocol}\n${app}`;
new Script(code); // syntax verification

const css = await read('style.css');
const analysisMd = await read('analysis.md');
const analysisHtml = renderMarkdown(analysisMd);

const html = (await read('index.html'))
  .replace('href="../index.html"', 'href="../../index.html"')
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}</style>`)
  .replace(
    `<script>if (location.protocol === 'file:') location.replace('dist/reader-presence.html');</script><script type="module" src="app.js"></script>`,
    () => `<script>\n${code.replaceAll('</script', '<\\/script')}</script>`
  )
  .replace('<!--RESEARCH-->', () => analysisHtml);

if (/<(?:script|link)[^>]+(?:src|href)=/i.test(html)) {
  throw new Error('Unbundled runtime asset');
}
if ((html.match(/<script\b/gi) || []).length !== 1 || (html.match(/<\/script>/gi) || []).length !== 1) {
  throw new Error('Expected exactly one <script>...</script> block in bundled HTML');
}

await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/reader-presence.html', root), html);

const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const keep = [...head.matchAll(/<title>[\s\S]*?<\/title>|<meta name="description"[^>]*>|<style>[\s\S]*?<\/style>/g)].map(m => m[0]);
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
await writeFile(new URL('dist/artifact.html', root), `${keep.join('\n')}\n${body}`);

console.log(`Built dist/reader-presence.html (${(html.length / 1024).toFixed(1)} KB) and dist/artifact.html; script parses; no external assets.`);
