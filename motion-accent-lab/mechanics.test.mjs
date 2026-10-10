import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimeline } from 'animejs';
import { sampleTime, illumination, DURATION } from './mechanics.mjs';
test('step sampling clamps and reaches the exact final state', () => {
  assert.equal(sampleTime(-5, true), 0);
  assert.equal(sampleTime(82, true), 0);
  assert.ok(Math.abs(sampleTime(84, true) - 1000 / 12) < 1e-9);
  assert.equal(sampleTime(1799, false), 1799);
  assert.equal(sampleTime(9999, true), DURATION);
});
test('actual Anime.js object timeline seeks backwards deterministically', () => {
  const pose = { sheet: 0, mark: 0, seal: 0, settle: 0 };
  const tl = createTimeline({ autoplay: false, defaults: { ease: 'out(3)' } })
    .add(pose, { sheet: [0, 1], duration: 700 }, 0)
    .add(pose, { mark: [0, 1], duration: 500, ease: 'inOut(2)' }, 540)
    .add(pose, { seal: [0, 1], duration: 430, ease: 'outBack' }, 950)
    .add(pose, { settle: [0, 1], duration: 450 }, 1350);
  assert.equal(tl.duration, DURATION);
  tl.seek(850, true); const before = { ...pose };
  tl.seek(DURATION, true);
  for (const value of Object.values(pose)) assert.equal(value, 1);
  tl.seek(850, true);
  for (const key of Object.keys(pose)) assert.ok(Math.abs(pose[key] - before[key]) < 1e-10);
  tl.seek(0, true);
  for (const value of Object.values(pose)) assert.ok(Math.abs(value) < 1e-10);
  tl.cancel();
});
test('quantized illumination has exactly N bands and retains an ambient floor', () => {
  for (let bands = 2; bands <= 6; bands++) {
    const levels = new Set();
    for (let i = 0; i <= 100; i++) levels.add(illumination(i / 100, 0, 0, 0, bands).toFixed(5));
    // This sample reaches 0.8 direct light, so use a unit direction alignment for the top band too.
    levels.add(illumination(.8, 0, .6, 0, bands).toFixed(5));
    assert.equal(levels.size, bands);
  }
  assert.equal(illumination(-1, 0, 0, 0, 4), .22);
  assert.equal(illumination(.8, 0, .6, 0, 4), 1);
});
