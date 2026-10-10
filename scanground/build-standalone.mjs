// Package Vite's single entry into an HTML file that also opens from disk.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { Script } from 'node:vm';
const root = new URL('dist/', import.meta.url);
let html = await readFile(new URL('index.html', root), 'utf8');
const scripts = [];
for (const match of html.matchAll(/<script\b[^>]*src="(\.\/assets\/[^"\s]+\.js)"[^>]*><\/script>/g)) {
  const code = await readFile(new URL(match[1], root), 'utf8');
  // Fail explicitly if future code splitting or module syntax needs a different packager.
  new Script(code);
  scripts.push(code.replace(/<\/script/gi, '<\\/script'));
  html = html.replace(match[0], '');
}
if (scripts.length !== 1) throw new Error('Expected one self-contained Vite entry');
for (const match of html.matchAll(/<link\b[^>]*href="(\.\/assets\/[^"\s]+\.css)"[^>]*>/g)) {
  const css = await readFile(new URL(match[1], root), 'utf8');
  if (/url\((?!["']?data:)/i.test(css)) throw new Error('Unbundled CSS asset');
  html = html.replace(match[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
}
// Inline classic scripts run after the React root exists; no file:// module requests.
html = html.replace('</body>', () => `<script>${scripts.join('\n')}</script>\n</body>`);
if (/<script\b[^>]*src=|<link\b[^>]*href="\.\/assets\//i.test(html)) throw new Error('Unbundled runtime asset');
const assets = await readdir(new URL('assets/', root));
if (assets.filter(name => name.endsWith('.js')).length !== 1) throw new Error('Split JavaScript chunks need a different standalone packager');
if (assets.some(name => !/\.(js|css)$/.test(name))) throw new Error('New assets need explicit standalone packaging');
await writeFile(new URL('index.html', root), html);
console.log(`Built standalone Scanground (${Buffer.byteLength(html)} bytes); JavaScript parses.`);
