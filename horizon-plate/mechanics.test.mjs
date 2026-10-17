import test from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { crc32, encodePNG, packRows, quantize, tone, downsample, engrave, halftone, bayer, diffuse, mezzotint, renderScene, BAYER8 } from "./mechanics.mjs";

const mean = (a, scale = 1) => a.reduce((s, v) => s + v, 0) / a.length / scale;

function readPNG(png) {
  const dv = new DataView(png.buffer);
  const chunks = {};
  let idat = [];
  for (let p = 8; p < png.length; ) {
    const len = dv.getUint32(p), type = String.fromCharCode(...png.subarray(p + 4, p + 8));
    const data = png.subarray(p + 8, p + 8 + len);
    assert.equal(dv.getUint32(p + 8 + len), crc32(png.subarray(p + 4, p + 8 + len)), `${type} CRC`);
    if (type === "IDAT") idat.push(data); else chunks[type] = data;
    p += 12 + len;
  }
  return { chunks, raw: inflateSync(Buffer.concat(idat)) };
}

test("crc32 matches the PNG IEND constant", () => {
  assert.equal(crc32(new TextEncoder().encode("IEND")), 0xae426082);
});

test("indexed PNG round-trips every bit depth with odd widths", async () => {
  for (const bits of [1, 2, 4, 8]) {
    const w = 13, h = 5, max = (1 << bits) - 1;
    const idx = Uint8Array.from({ length: w * h }, (_, i) => (i * 7) % (max + 1));
    const png = await encodePNG(idx, w, h, bits, [39, 71, 196]);
    const { chunks, raw } = readPNG(png);
    const ih = new DataView(chunks.IHDR.buffer, chunks.IHDR.byteOffset);
    assert.deepEqual([ih.getUint32(0), ih.getUint32(4), chunks.IHDR[8], chunks.IHDR[9]], [w, h, bits, 3]);
    assert.equal(chunks.PLTE.length, (max + 1) * 3);
    assert.deepEqual([...chunks.PLTE.subarray(0, 3)], [39, 71, 196]);
    assert.equal(chunks.tRNS[0], 0);
    assert.equal(chunks.tRNS[max], 255);
    assert.deepEqual(raw, Buffer.from(packRows(idx, w, h, bits)));
    const rowBytes = Math.ceil((w * bits) / 8);
    for (let y = 0; y < h; y++) {
      assert.equal(raw[y * (rowBytes + 1)], 0, "filter byte");
      for (let x = 0; x < w; x++) {
        const byte = raw[y * (rowBytes + 1) + 1 + Math.floor((x * bits) / 8)];
        const v = (byte >> (8 - bits - ((x * bits) % 8))) & max;
        assert.equal(v, idx[y * w + x]);
      }
    }
  }
});

test("tone: the ink floor leaves the sky empty and the dissolve clears the top row", () => {
  const w = 40, h = 40, lum = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) lum[y * w + x] = y < 20 ? 0.9 + 0.02 * Math.sin(x) : 0.2;
  const t = tone(lum, w, h, { contrast: 1, gamma: 1, lift: 0.2, fade: 0, inkLight: false });
  assert.ok(t.subarray(0, 20 * w).every((v) => v === 0), "sky has no ink");
  assert.ok(t[30 * w] > 0.9, "ground is inked");
  const faded = tone(lum, w, h, { contrast: 1, gamma: 1, lift: 0, fade: 0.5, inkLight: true });
  assert.ok(faded.subarray(0, w).every((v) => v === 0), "first row dissolved");
});

test("error diffusion preserves mean tone; Atkinson drops a faint field entirely", () => {
  const n = 64, g = new Float32Array(n * n).fill(0.3);
  assert.ok(Math.abs(mean(diffuse(g, n, n, "fs"), 255) - 0.3) < 0.01);
  assert.ok(Math.abs(mean(bayer(g, n, n), 255) - 0.3) < 0.02);
  assert.ok(Math.abs(mean(mezzotint(g, n, n), 255) - 0.3) < 0.03);
  const faint = new Float32Array(n * n).fill(0.05);
  assert.ok(mean(diffuse(faint, n, n, "atkinson"), 255) < mean(diffuse(faint, n, n, "fs"), 255));
});

test("Bayer matrix is a permutation of 0..63", () => {
  assert.deepEqual([...BAYER8].sort((a, b) => a - b), Array.from({ length: 64 }, (_, i) => i));
});

test("line fields: no ink gives no lines, full ink never closes into a slab", () => {
  const w = 120, h = 120, zero = new Float32Array(w * h), full = new Float32Array(w * h).fill(1);
  assert.equal(mean(engrave(zero, w, h, { pitch: 8, field: "flat", hatch: false })), 0);
  const solid = mean(engrave(full, w, h, { pitch: 8, field: "flat", hatch: false }), 255);
  assert.ok(solid > 0.75 && solid < 0.95, `flat engraving at full ink covers ${solid}`);
  const half = mean(halftone(new Float32Array(w * h).fill(0.5), w, h, { pitch: 8, angle: Math.PI / 4 }), 255);
  assert.ok(Math.abs(half - 0.5) < 0.06, `halftone at 50% covers ${half}`);
});

test("downsample averages rectangular cells and quantize maps to level indices", () => {
  const t = Float32Array.from({ length: 16 }, (_, i) => (i % 4 < 2 ? 1 : 0));
  const { g, gw, gh } = downsample(t, 4, 4, 2, 4);
  assert.deepEqual([gw, gh, ...g], [2, 1, 1, 0]);
  assert.deepEqual([...quantize(Uint8Array.from([0, 85, 170, 255]), 2)], [0, 1, 2, 3]);
});

test("scenes render in range with a sky lighter or darker than the ground by design", () => {
  for (const key of ["dunes", "hills", "range"]) {
    const w = 160, h = 80, l = renderScene(key, w, h);
    assert.ok(l.every((v) => v >= 0 && v <= 1));
    const sky = mean(l.subarray(0, w * 10)), ground = mean(l.subarray(w * 75));
    assert.ok(Math.abs(sky - ground) > 0.15, `${key}: sky ${sky.toFixed(2)} vs ground ${ground.toFixed(2)}`);
  }
});
