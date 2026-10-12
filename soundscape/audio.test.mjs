import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const code = await readFile(new URL('audio.js', import.meta.url), 'utf8');
const meta = JSON.parse(await readFile(new URL('audio/sprite.json', import.meta.url)));
class Param { setValueAtTime() {} linearRampToValueAtTime() {} setTargetAtTime() {} }
class Node {
  constructor() { this.gain = new Param(); this.pan = new Param(); this.threshold = new Param(); this.knee = new Param(); this.ratio = new Param(); this.attack = new Param(); this.release = new Param(); }
  connect() {} disconnect() { this.disconnected = true; }
  start(...args) { this.args = args; } stop() { this.stopped = true; }
}
class Context {
  constructor() { this.currentTime = 0; this.state = 'suspended'; this.sources = []; this.decodeCount = 0; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createGain() { return new Node(); } createDynamicsCompressor() { return new Node(); }
  createAnalyser() { return new Node(); } createStereoPanner() { return new Node(); }
  createBufferSource() { const node = new Node(); this.sources.push(node); return node; }
  decodeAudioData() { this.decodeCount++; return Promise.resolve({ length: meta.frames, numberOfChannels: 2, sampleRate: 44100 }); }
}
function setup() {
  const scope = vm.createContext({ atob, performance, Uint8Array });
  vm.runInContext(code + '\nglobalThis.SpriteAudio = SpriteAudio;', scope);
  let hidden = false; const played = [];
  const audio = new scope.SpriteAudio({ ...meta, base64: 'AA==' }, { Context, hidden: () => hidden, onPlay: e => played.push(e) });
  return { audio, played, hide: () => { hidden = true; } };
}
test('no pre-unlock playback; enabling again reuses the decode and context', async () => {
  const { audio } = setup(); assert.equal(audio.play('complete'), false);
  await audio.enable(); const c = audio.context; audio.mute(); await audio.enable();
  assert.equal(audio.context, c); assert.equal(c.decodeCount, 1);
});
test('essential suppresses interaction/focus, silent suppresses results, audition is explicit', async () => {
  const { audio } = setup(); await audio.enable();
  assert.equal(audio.play('tap'), false); assert.equal(audio.play('hover', { category: 'focus' }), false);
  assert.equal(audio.play('complete', { category: 'result' }), true);
  audio.setMode('silent'); assert.equal(audio.voices.size, 0);
  assert.equal(audio.play('complete', { category: 'result' }), false);
  assert.equal(audio.play('complete', { audition: true }), true);
  audio.mute(); assert.equal(audio.voices.size, 0); assert.equal(audio.play('tap', { audition: true }), false);
});
test('all cues schedule exactly their own offsets and durations, with bounded pan', async () => {
  const { audio } = setup(); await audio.enable();
  for (const [name, cue] of Object.entries(meta.cues)) {
    audio.context.currentTime += 1;
    assert.equal(audio.play(name, { audition: true, pan: 99 }), true);
    const node = audio.context.sources.at(-1);
    assert.deepEqual(Array.from(node.args), [audio.context.currentTime, cue.start, cue.duration]);
    node.onended();
  }
  assert.equal(audio.voices.size, 0);
});
test('cooldown limits repeated cues and shared focus; voice budget retires oldest', async () => {
  const { audio } = setup(); await audio.enable(); audio.setMode('full');
  assert.equal(audio.play('tick', { category: 'focus' }), true);
  assert.equal(audio.play('hover', { category: 'focus' }), false);
  audio.context.currentTime += .101; assert.equal(audio.play('hover', { category: 'focus' }), true);
  assert.equal(audio.play('hover', { category: 'focus' }), false);
  const first = audio.context.sources[0];
  for (const name of ['on', 'off', 'press', 'release', 'tap', 'thock', 'switch']) audio.play(name);
  assert.equal(audio.voices.size, 6); assert.equal(first.stopped, true); assert.equal(first.disconnected, true);
});
test('hidden and suspended contexts reject cues; mute stops every source', async () => {
  const { audio, hide } = setup(); await audio.enable(); audio.play('loading', { category: 'state' });
  audio.context.state = 'suspended'; assert.equal(audio.play('ready', { category: 'state' }), false);
  audio.context.state = 'running'; hide(); assert.equal(audio.play('ready', { audition: true }), false);
  audio.mute(); assert(audio.context.sources.every(s => s.stopped)); assert.equal(audio.voices.size, 0);
});
