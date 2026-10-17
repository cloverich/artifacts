// Horizon Plate mechanics: pure functions, no DOM. The page imports nothing;
// build.mjs strips `export` and inlines this file ahead of app.js. Runs
// unchanged in Node, given luminance from any image decoder.
//
// Pipeline: luminance (Float32 0..1) → tone (ink amount 0..1) → algorithm
// (Uint8 coverage 0..255) → quantize → indexed PNG. Ink colour never enters
// the pipeline; CSS applies it, so one mask serves every theme of a polarity.

const hash2 = (x, y, s) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ── Tone ─────────────────────────────────────────────────────────────────
// Luminance → ink amount. Auto-levels on percentiles, polarity, gamma, a lift
// (ink below this is dropped, so the sky goes clean and meets the page
// colour exactly), and a vertical fade that thins the ink itself rather than
// the opacity, so a dither dissolves dot by dot into the page.
export function tone(lum, w, h, o) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < lum.length; i++) hist[(lum[i] * 255) | 0]++;
  const pct = (q) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) if ((acc += hist[v]) >= lum.length * q) return v / 255;
    return 1;
  };
  const lo = pct(0.005), range = Math.max(1 / 255, pct(0.995) - lo);
  const fadeRows = Math.round(h * o.fade);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const f = fadeRows > 0 && y < fadeRows ? smooth(y / fadeRows) : 1;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let t = clamp01((lum[i] - lo) / range);
      t = clamp01((t - 0.5) * o.contrast + 0.5);
      if (!o.inkLight) t = 1 - t;
      t = t <= o.lift ? 0 : (t - o.lift) / (1 - o.lift);
      out[i] = Math.pow(t, o.gamma) * f;
    }
  }
  return out;
}

// Box-average ink onto a coarser grid: the dot grid of block algorithms
// (cw × ch device pixels per cell; ASCII cells are taller than wide).
export function downsample(t, w, h, cw, ch = cw) {
  const gw = Math.ceil(w / cw), gh = Math.ceil(h / ch);
  const g = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++) {
      let s = 0, n = 0;
      for (let y = gy * ch; y < Math.min(h, gy * ch + ch); y++)
        for (let x = gx * cw; x < Math.min(w, gx * cw + cw); x++, n++) s += t[y * w + x];
      g[gy * gw + gx] = s / n;
    }
  return { g, gw, gh };
}

// ── Algorithms: ink (Float32) → coverage (Uint8) ─────────────────────────
// Continuous-field algorithms render at full resolution with ~1px analytic
// antialiasing. Block algorithms render on their dot grid; the page scales
// that grid up with `image-rendering: pixelated`, so the file stays small.
const cov = (v) => (v <= 0 ? 0 : v >= 1 ? 255 : (v * 255 + 0.5) | 0);

export function engrave(t, w, h, o) {
  const s = o.pitch, out = new Uint8Array(w * h);
  const MAX = 0.82, HATCH_FROM = 0.7;
  const amp = o.field === "wave" ? s * 1.6 : 0;
  const k1 = (2 * Math.PI) / (260 * (s / 10)), k2 = (2 * Math.PI) / (97 * (s / 10));
  const wave = new Float32Array(w);
  for (let x = 0; x < w; x++) wave[x] = amp * (Math.sin(x * k1) + 0.35 * Math.sin(x * k2));
  // Relief: lines are pushed up by a blurred copy of the ink, so they bow
  // over shapes, a cheap stand-in for lines that follow form.
  const relief = o.field === "relief" ? blurRows(t, w, h, Math.max(2, s)) : null;
  const ra = s * 2.2;
  const hs = Math.sin(1.05), hc = Math.cos(1.05);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x, ti = t[i];
      if (ti <= 0) continue;
      const u = (y + wave[x] - (relief ? relief[i] * ra : 0)) / s;
      const d = Math.abs(u - Math.floor(u) - 0.5) * 2;
      let a = (ti * MAX - d) * (s / 2) + 0.5;
      if (o.hatch && ti > HATCH_FROM) {
        const t2 = ((ti - HATCH_FROM) / (1 - HATCH_FROM)) * 0.5;
        const u2 = (x * hs + y * hc) / s;
        const d2 = Math.abs(u2 - Math.floor(u2) - 0.5) * 2;
        a = Math.max(a, (t2 - d2) * (s / 2) + 0.5);
      }
      out[i] = cov(a);
    }
  return out;
}

function blurRows(t, w, h, r) {
  // Separable box blur, two passes ≈ tent. Used only to bend line fields.
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  const pass = (src, dst, len, stride, count, step) => {
    for (let c = 0; c < count; c++) {
      const o = c * step;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[o + Math.min(len - 1, Math.max(0, k)) * stride];
      for (let k = 0; k < len; k++) {
        dst[o + k * stride] = acc / (2 * r + 1);
        acc += src[o + Math.min(len - 1, k + r + 1) * stride] - src[o + Math.max(0, k - r) * stride];
      }
    }
  };
  pass(t, tmp, w, 1, h, w);
  pass(tmp, out, h, w, w, 1);
  return out;
}

export function halftone(t, w, h, o) {
  // AM screen: Euclidean spot function on a rotated lattice. Dots grow,
  // touch at 50% as a checkerboard, then invert into holes.
  const s = o.pitch, out = new Uint8Array(w * h);
  const ca = Math.cos(o.angle), sa = Math.sin(o.angle);
  const k = (2 * Math.PI) / s, edge = s / 4.4; // ≈ 1/|∇f| per pixel
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x, ti = t[i];
      if (ti <= 0) continue;
      const u = (x * ca + y * sa) * k, v = (-x * sa + y * ca) * k;
      const f = 0.5 * (Math.cos(u) + Math.cos(v));
      out[i] = cov((f - (1 - 2 * ti)) * edge + 0.5);
    }
  return out;
}

// Bayer 8×8, built recursively; values are the classic 0..63 order.
export const BAYER8 = (() => {
  let m = [[0]];
  for (let n = 1; n < 8; n *= 2)
    m = [...m.map((r) => [...r.map((v) => 4 * v), ...r.map((v) => 4 * v + 2)]), ...m.map((r) => [...r.map((v) => 4 * v + 3), ...r.map((v) => 4 * v + 1)])];
  return m.flat();
})();

export function bayer(g, gw, gh) {
  const out = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) out[y * gw + x] = g[y * gw + x] > (BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64 ? 255 : 0;
  return out;
}

// Error diffusion. Floyd–Steinberg (serpentine) keeps all the error, so
// tone is preserved; Atkinson spreads only 6/8 of it, which drops the
// faintest dots and crushes deep tones: clean skies, graphic shadows.
export function diffuse(g, gw, gh, kernel) {
  const e = Float32Array.from(g), out = new Uint8Array(gw * gh);
  const fs = kernel === "fs";
  for (let y = 0; y < gh; y++) {
    const rev = fs && y & 1, dir = rev ? -1 : 1;
    for (let n = 0; n < gw; n++) {
      const x = rev ? gw - 1 - n : n, i = y * gw + x;
      const on = e[i] > 0.5 ? 1 : 0;
      out[i] = on * 255;
      const err = e[i] - on;
      const put = (dx, dy, f) => {
        const xx = x + dx * dir, yy = y + dy;
        if (xx >= 0 && xx < gw && yy < gh) e[yy * gw + xx] += err * f;
      };
      if (fs) { put(1, 0, 7 / 16); put(-1, 1, 3 / 16); put(0, 1, 5 / 16); put(1, 1, 1 / 16); }
      else { const f = 1 / 8; put(1, 0, f); put(2, 0, f); put(-1, 1, f); put(0, 1, f); put(1, 1, f); put(0, 2, f); }
    }
  }
  return out;
}

// Mezzotint: threshold against random noise. Grain with no structure: the
// look of a rocker-grounded plate, or of film grain at one bit.
export function mezzotint(g, gw, gh, seed = 1) {
  const out = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) out[y * gw + x] = g[y * gw + x] > hash2(x, y, seed) ? 255 : 0;
  return out;
}

// Scanline: fixed-width rows whose intensity (not width) carries tone. Reads
// as a display, not a print; needs grey levels, so it costs bits.
export function scanline(t, w, h, o) {
  const s = o.pitch, out = new Uint8Array(w * h), duty = 0.55;
  for (let y = 0; y < h; y++) {
    const ph = (y % s) / s, row = Math.max(0, 1 - Math.abs(ph - 0.5) / (duty / 2));
    const lineCov = Math.min(1, row * (s / 2));
    if (lineCov <= 0) continue;
    for (let x = 0; x < w; x++) out[y * w + x] = cov(t[y * w + x] * lineCov);
  }
  return out;
}

export const ASCII_RAMP = " .,:;-=+*#%@";
export function asciiCells(g, gw, gh) {
  const n = ASCII_RAMP.length - 1, out = new Uint8Array(gw * gh);
  for (let i = 0; i < g.length; i++) out[i] = Math.min(n, Math.round(g[i] * n));
  return out;
}

// ── Output ───────────────────────────────────────────────────────────────
// Quantize coverage to 2^bits levels; returns level indices 0..levels-1.
// With a width, an ordered (Bayer) offset dithers between adjacent levels,
// so 16 levels read as continuous tone instead of banding.
export function quantize(c, bits, w = 0) {
  const max = (1 << bits) - 1, out = new Uint8Array(c.length);
  for (let i = 0; i < c.length; i++) {
    const d = w ? (BAYER8[((i / w) & 7) * 8 + ((i % w) & 7)] + 0.5) / 64 - 0.5 : 0;
    const v = Math.round((c[i] / 255) * max + d);
    out[i] = v < 0 ? 0 : v > max ? max : v;
  }
  return out;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Pack level indices into PNG scanlines (filter byte 0, MSB-first bits).
export function packRows(idx, w, h, bits) {
  const rowBytes = Math.ceil((w * bits) / 8), out = new Uint8Array((rowBytes + 1) * h);
  const per = 8 / bits;
  for (let y = 0; y < h; y++) {
    const o = y * (rowBytes + 1) + 1;
    for (let x = 0; x < w; x++) {
      const v = idx[y * w + x];
      out[o + ((x / per) | 0)] |= v << (8 - bits * ((x % per) + 1));
    }
  }
  return out;
}

// PNG row filters (spec §9). Indexed images filter on bytes with bpp = 1.
// Per row, keep the filter with the smallest sum of |signed bytes|: the
// standard heuristic. Filter 0 is best for 1-bit art; Up and Paeth win on
// smooth gradients like the continuous ink map.
export function filterRows(raw, rowBytes, h) {
  const stride = rowBytes + 1, out = new Uint8Array(raw.length), cand = new Uint8Array(rowBytes);
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const o = y * stride + 1, up = o - stride;
    let best = Infinity;
    for (let f = 0; f < 5; f++) {
      let sum = 0;
      for (let i = 0; i < rowBytes; i++) {
        const x = raw[o + i], a = i ? raw[o + i - 1] : 0, b = y ? raw[up + i] : 0, c = y && i ? raw[up + i - 1] : 0;
        const v = (x - (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255;
        cand[i] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < best) { best = sum; out[o - 1] = f; out.set(cand, o); }
    }
  }
  return out;
}

// Indexed PNG: every palette entry is the ink colour; tRNS carries the
// coverage ramp. The same file works as a CSS alpha mask (theme applies the
// colour) and as a plain pre-inked <img>.
export async function encodePNG(idx, w, h, bits, rgb = [0, 0, 0]) {
  const levels = 1 << bits, max = levels - 1;
  const packed = packRows(idx, w, h, bits);
  const raw = bits === 8 ? filterRows(packed, Math.ceil(w), h) : packed; // palette art: filter 0
  const zlib = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = bits; ihdr[9] = 3;
  const plte = new Uint8Array(levels * 3), trns = new Uint8Array(levels);
  for (let i = 0; i < levels; i++) { plte.set(rgb, i * 3); trns[i] = Math.round((i / max) * 255); }
  const chunks = [["IHDR", ihdr], ["PLTE", plte], ["tRNS", trns], ["IDAT", zlib], ["IEND", new Uint8Array(0)]];
  const size = 8 + chunks.reduce((n, [, d]) => n + 12 + d.length, 0);
  const png = new Uint8Array(size), pv = new DataView(png.buffer);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  let p = 8;
  for (const [type, data] of chunks) {
    pv.setUint32(p, data.length);
    const body = new Uint8Array(4 + data.length);
    for (let i = 0; i < 4; i++) body[i] = type.charCodeAt(i);
    body.set(data, 4);
    png.set(body, p + 4);
    pv.setUint32(p + 4 + body.length, crc32(body));
    p += 12 + data.length;
  }
  return png;
}
