import test from "node:test";
import assert from "node:assert/strict";
import { inflateSync, deflateSync } from "node:zlib";
const require_deflate = (b) => deflateSync(Buffer.from(b)).length;
import { crc32, encodePNG, packRows, filterRows, quantize, tone, downsample, engrave, halftone, diffuse, BAYER8 } from "./mechanics.mjs";

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

// Reverse PNG filters (spec §9.2) with bpp = 1, as a decoder would.
function unfilter(raw, rowBytes, h) {
  const out = Buffer.from(raw), stride = rowBytes + 1;
  for (let y = 0; y < h; y++) {
    const o = y * stride + 1, up = o - stride, f = out[o - 1];
    for (let i = 0; i < rowBytes; i++) {
      const a = i ? out[o + i - 1] : 0, b = y ? out[up + i] : 0, c = y && i ? out[up + i - 1] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      out[o + i] = (out[o + i] + pred) & 255;
    }
    out[o - 1] = 0;
  }
  return out;
}

test("crc32 matches the PNG IEND constant", () => {
  assert.equal(crc32(new TextEncoder().encode("IEND")), 0xae426082);
});

test("indexed PNG round-trips every bit depth with odd widths", async () => {
  for (const bits of [1, 2, 4, 8]) {
    const w = 13, h = 5, max = (1 << bits) - 1;
    const idx = Uint8Array.from({ length: w * h }, (_, i) => (i * 7) % (max + 1));
    const png = await encodePNG(idx, w, h, bits, [39, 71, 196]);
    const { chunks, raw: filtered } = readPNG(png);
    const raw = unfilter(filtered, Math.ceil((w * bits) / 8), h);
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

test("adaptive row filters invert exactly and shrink a smooth gradient", () => {
  const w = 64, h = 16, idx = Uint8Array.from({ length: w * h }, (_, i) => (i % w) * 4 + ((i / w) | 0));
  const packed = packRows(idx, w, h, 8), filtered = filterRows(packed, w, h);
  assert.deepEqual(unfilter(filtered, w, h), Buffer.from(packed));
  const size = (b) => require_deflate(b);
  assert.ok(size(filtered) < size(packed), "filtering helps gradients");
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

test("tone: zoomed out, no ink outside the photo and its sides dissolve", () => {
  const w = 40, h = 20, lum = Float32Array.from({ length: w * h }, (_, i) => (i / w < 12 ? 0.9 : 0.1));
  const t = tone(lum, w, h, { contrast: 1, gamma: 1, lift: 0, fade: 0, sides: 0.25, inkLight: false, rect: [10, 5, 30, 20] });
  assert.equal(t[2 * w + 20], 0, "above the photo");
  assert.equal(t[10 * w + 5], 0, "left of the photo");
  assert.equal(t[16 * w + 10], 0, "the side ramp starts at zero");
  assert.ok(t[16 * w + 20] > 0.9, "middle of the dark ground is inked");
  assert.ok(t[16 * w + 12] < t[16 * w + 20], "the side ramp thins ink");
});

test("error diffusion preserves mean tone; Atkinson drops a faint field entirely", () => {
  const n = 64, g = new Float32Array(n * n).fill(0.3);
  assert.ok(Math.abs(mean(diffuse(g, n, n, "fs"), 255) - 0.3) < 0.01);
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
