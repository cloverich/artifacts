import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readWav, packCues, encodeWav } from './wav.mjs';
const wav = await readFile(new URL('audio/mechanical-8st.wav', import.meta.url));
const meta = JSON.parse(await readFile(new URL('audio/sprite.json', import.meta.url)));
const provenance = JSON.parse(await readFile(new URL('audio/provenance.json', import.meta.url)));
const pcm = readWav(wav);
test('manifest matches sprite bytes and all 28 bounded, sample-accurate ranges', () => {
  assert.equal(createHash('sha256').update(wav).digest('hex'), meta.sha256);
  assert.equal(pcm.frames, meta.frames); assert.equal(Object.keys(meta.cues).length, 28);
  let cursor = 0;
  for (const cue of Object.values(meta.cues)) {
    assert.equal(cue.startFrame, cursor); assert.equal(cue.start, cursor / pcm.rate);
    assert.equal(cue.duration, cue.frames / pcm.rate);
    cursor += cue.frames;
    assert(pcm.data.subarray(cursor * 4, (cursor + meta.gapFrames) * 4).every(b => b === 0));
    cursor += meta.gapFrames;
  }
  assert.equal(cursor, pcm.frames);
});
test('each sprite slice reconstructs the exact supplied WAV hash', () => {
  for (const [name, cue] of Object.entries(meta.cues)) {
    const reconstructed = encodeWav(pcm.data.subarray(cue.startFrame * 4, (cue.startFrame + cue.frames) * 4));
    assert.equal(createHash('sha256').update(reconstructed).digest('hex'), provenance.files[name].sha256, name);
  }
});
test('packing places silence between cues without changing PCM', () => {
  const first = readWav(encodeWav(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8])));
  const second = readWav(encodeWav(Buffer.from([8, 7, 6, 5])));
  const result = packCues([['one', first], ['two', second]], 2);
  const combined = readWav(result.wav);
  assert.equal(result.cues.two.startFrame, 4);
  assert.deepEqual(combined.data.subarray(0, 8), first.data);
  assert.deepEqual(combined.data.subarray(8, 16), Buffer.alloc(8));
  assert.deepEqual(combined.data.subarray(16, 20), second.data);
  assert.throws(() => packCues([['one', first], ['one', second]]), /duplicate/);
});
test('rejects LFS pointers, truncated WAVs, and incompatible format', () => {
  assert.throws(() => readWav(Buffer.from('version https://git-lfs.github.com/spec/v1')), /LFS/);
  assert.throws(() => readWav(wav.subarray(0, 100)), /Truncated/);
  const mono = Buffer.from(wav); mono.writeUInt16LE(1, 22);
  assert.throws(() => readWav(mono), /stereo/);
});
