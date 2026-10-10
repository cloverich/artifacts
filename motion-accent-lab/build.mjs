import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { Script } from 'node:vm';
const read = p => readFile(new URL(p, import.meta.url), 'utf8');
const [html, css, app, mechanics, anime, license, analysis] = await Promise.all([
  read('index.html'), read('style.css'), read('app.js'), read('mechanics.mjs'),
  read('node_modules/animejs/dist/bundles/anime.umd.min.js'),
  read('node_modules/animejs/LICENSE.md'), read('analysis.md')
]);
const code = mechanics.replaceAll('export ', '') + '\n' + app;
new Script(code);
new Script(anime);
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const output = html.replace('<!--STYLE-->', () => '<style>' + css + '</style>')
  .replace('<!--RESEARCH-->', () => '<pre class="research">' + escape(analysis) + '</pre>')
  .replace('<!--SCRIPTS-->', () => '<script>' + anime + '</script><script>' + code.replaceAll('</script', '<\\/script') + '</script>')
  .replace('<!--LICENSE-->', () => '<pre>' + escape(license) + '</pre>');
for (const match of output.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(match[1]);
if (/<(?:script|link)[^>]+(?:src|href)=/i.test(output)) throw new Error('External runtime asset');
await mkdir(new URL('dist/', import.meta.url), { recursive: true });
await writeFile(new URL('dist/motion-accent.html', import.meta.url), output);
console.log('Built offline dist/motion-accent.html (' + Buffer.byteLength(output) + ' bytes)');
