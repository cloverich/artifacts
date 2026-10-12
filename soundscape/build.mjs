import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { readWav } from './wav.mjs';
const here = new URL('./', import.meta.url);
const read = name => readFile(new URL(name, here), 'utf8');
const [template, css, engine, visuals, app, map, license, wav] = await Promise.all([
  read('index.html'), read('style.css'), read('audio.js'), read('visuals.js'), read('app.js'), read('audio/sprite.json'), read('FOLEY-LICENSE.txt'),
  readFile(new URL('audio/mechanical-8st.wav', here))
]);
const meta = JSON.parse(map), pcm = readWav(wav);
if (createHash('sha256').update(wav).digest('hex') !== meta.sha256 || pcm.frames !== meta.frames) throw new Error('Sprite does not match manifest');
for (const cue of Object.values(meta.cues)) {
  if (cue.startFrame < 0 || cue.frames <= 0 || cue.startFrame + cue.frames > pcm.frames) throw new Error('Invalid sprite range');
}
const payload = `const SOUND_DATA = ${JSON.stringify({ ...meta, base64: wav.toString('base64') })};`;
const js = `${payload}\n${engine}\n${visuals}\n${app}`;
new Script(js, { filename: 'soundscape.js' });
const escape = str => str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const html = template.replace('/* STYLES */', css).replace('/* SCRIPTS */', js.replaceAll('</script', '<\\/script')).replace('FOLEY_LICENSE', escape(license));
if (/\/\* (?:STYLES|SCRIPTS) \*\//.test(html)) throw new Error('Unresolved template slot');
await mkdir(new URL('dist/', here), { recursive: true });
await writeFile(new URL('dist/soundscape.html', here), html);
// index.html in dist is convenient for ordinary local static previews.
await writeFile(new URL('dist/index.html', here), html);
console.log(`Built standalone soundscape.html: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB, 0 runtime dependencies.`);
