import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('./', import.meta.url);
let html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('style.css', root), 'utf8');
const js = await readFile(new URL('app.js', root), 'utf8');
if (/<\/script/i.test(js)) throw new Error('Unexpected closing script in application source');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`);
html = html.replace('<script src="app.js" defer></script>', () => `<script>\n${js}\n</script>`);
await mkdir(new URL('dist/', root), { recursive: true });
const output = new URL('dist/steward.html', root);
await writeFile(output, html);
console.log(`${fileURLToPath(output)} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB, self-contained)`);
