import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const [html, css, research] = await Promise.all(['index.html', 'style.css', 'analysis.md'].map(read));

// Fixed dependency order; this project uses only named declarations.
// Reject unsupported module syntax instead of silently emitting a broken bundle.
const modules = [];
for (const name of ['shaders.js', 'audio.js', 'timeline.js', 'app.js']) {
  let source = await read(name);
  if (name === 'app.js') {
    source = source.replace(/^import \{[^}]+\} from '\.\/(shaders|audio|timeline)\.js';\r?\n/gm, '');
  }
  source = source.replace(/^export (?=(?:const|class|function)\b)/gm, '');
  if (/^\s*(?:import|export)\b/m.test(source)) throw new Error(`Unsupported module syntax in ${name}`);
  modules.push(`// Source: ${name}\n${source}`);
}
const javascript = `(() => {\n'use strict';\n${modules.join('\n')}\n})();`;
new Script(javascript, {filename: 'tunnel-signal.js'});

// Keep future strings or comments from terminating inline raw-text blocks.
const inlineJs = javascript.replace(/<\/script/gi, '<\\/script');
const inlineCss = css.replace(/<\/style/gi, '<\\/style');
const researchBlock = `<details id="research" class="bundled-research"><summary>Read the full dissection</summary><pre>${escapeHtml(research)}</pre></details>`;
const output = html
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>${inlineCss}\n.bundled-research{margin:24px 0 40px;font-size:12px}.bundled-research summary{cursor:pointer;color:var(--hot)}.bundled-research pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;color:var(--muted)}</style>`)
  .replace('<script type="module" src="app.js"></script>', '')
  .replaceAll('href="analysis.md"', 'href="#research"')
  .replace('</main>', () => `${researchBlock}\n</main>`)
  .replace('</body>', () => `<script>${inlineJs}</script>\n</body>`);
if (/<(?:script[^>]+src|link[^>]+rel="stylesheet")/i.test(output)) throw new Error('Unbundled runtime asset');

const directory = new URL('dist/', import.meta.url);
const target = new URL('tunnel-signal.html', directory);
await mkdir(directory, {recursive: true});
await writeFile(target, output);
console.log(`Built ${fileURLToPath(target)} (${Buffer.byteLength(output)} bytes). Open directly in a browser.`);
