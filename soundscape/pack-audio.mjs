import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readWav, packCues } from './wav.mjs';
const here = new URL('./', import.meta.url);
const original = JSON.parse(await readFile(new URL('foley-sprite.json', here)));
const parts = [], provenance = {};
for (const [name, old] of Object.entries(original)) {
  const filename = `foley-mechanical-${name}-8st.wav`;
  const bytes = await readFile(new URL(`foley-cues-mechanical/${filename}`, here));
  const part = readWav(bytes);
  parts.push([name, part]);
  provenance[name] = { filename, sha256: createHash('sha256').update(bytes).digest('hex'),
    suppliedDuration: old.duration, actualDuration: part.frames / part.rate };
}
const { wav, cues, frames } = packCues(parts);
await mkdir(new URL('audio/', here), { recursive: true });
await writeFile(new URL('audio/mechanical-8st.wav', here), wav);
await writeFile(new URL('audio/sprite.json', here), JSON.stringify({ rate: 44100, channels: 2, bits: 16,
  gapFrames: 2205, frames, sha256: createHash('sha256').update(wav).digest('hex'), cues }, null, 2) + '\n');
await writeFile(new URL('audio/provenance.json', here), JSON.stringify({ source: 'User-supplied Foley exports, 12 October 2026',
  theme: 'mechanical', transpose: -8, upstreamSnapshot: 'bd31fd931b849fdc6c14c01ed2b78d0020a33720', files: provenance }, null, 2) + '\n');
console.log(`Packed ${parts.length} cues; ${wav.length} bytes; ${(frames / 44100).toFixed(3)} s. Samples preserved.`);
