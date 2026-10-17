// Horizon Plate mechanics: pure functions, no DOM. The page imports nothing;
// build.mjs strips `export` and inlines this file ahead of app.js.
//
// Pipeline: luminance (Float32 0..1) → tone (ink amount 0..1) → algorithm
// (Uint8 coverage 0..255) → quantize → indexed PNG. Ink colour never enters
// the pipeline; CSS applies it, so one mask serves every theme of a polarity.

// ── Noise ────────────────────────────────────────────────────────────────
const hash2 = (x, y, s) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const smooth = (t) => t * t * (3 - 2 * t);
export function valueNoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
export function fbm(x, y, s = 0, octaves = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let o = 0; o < octaves; o++, amp *= 0.5, f *= 2.03) v += amp * valueNoise(x * f, y * f, s + o * 17);
  return v;
}

// ── Procedural scenes (original stand-ins for photographs) ───────────────
// Each returns luminance at (w, h). Ridges are 1D height functions of x; a
// pixel takes the nearest ridge whose height it is below, so the scene is a
// stack of silhouettes with atmospheric perspective (far = closer to sky).
const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const SCENES = {
  dunes: {
    label: "Dunes, moonrise",
    horizon: 0.62,
    stars: 0.5,
    sky: (u, v) => mix(0.16, 0.34, (v / 0.62) ** 1.5),
    disc: { x: 0.37, y: 0.28, r: 0.03, lum: 0.96, crescent: 0.4 },
    ridges: [
      { base: 0.63, amp: 0.03, freq: 3, seed: 3, lum: 0.5, shade: 0.12, falloff: 30, darken: 0.4, grain: 0.04 },
      { base: 0.71, amp: 0.05, freq: 2.2, seed: 7, lum: 0.64, shade: 0.24, falloff: 14, darken: 0.5, grain: 0.06, streaks: 0.1 },
      { base: 0.84, amp: 0.07, freq: 1.4, seed: 11, lum: 0.78, shade: 0.3, falloff: 7, darken: 0.6, grain: 0.08, streaks: 0.14 },
    ],
  },
  hills: {
    label: "Hills, lone tree",
    horizon: 0.55,
    sky: (u, v) => mix(0.8, 0.93, v / 0.55) - 0.06 * fbm(u * 3, v * 7, 91, 4),
    ridges: [
      { base: 0.57, amp: 0.05, freq: 2.2, seed: 5, lum: 0.74, shade: 0.04, falloff: 20, darken: 0.3, grain: 0.02 },
      { base: 0.67, amp: 0.06, freq: 1.6, seed: 9, lum: 0.55, shade: 0.08, falloff: 12, darken: 0.6, grain: 0.05, streaks: 0.06 },
      { base: 0.8, amp: 0.05, freq: 1.1, seed: 13, lum: 0.34, shade: 0.1, falloff: 8, darken: 0.6, grain: 0.12, tree: 0.64 },
    ],
  },
  range: {
    label: "Range, low sun",
    horizon: 0.62,
    sky: (u, v) => mix(0.92, 0.74, v / 0.62) + 0.1 * Math.exp(-(((u - 0.7) ** 2 + (v - 0.52) ** 2) * 30)),
    disc: { x: 0.7, y: 0.52, r: 0.026, lum: 1, crescent: 0 },
    ridges: [
      { base: 0.64, amp: 0.09, freq: 4.5, seed: 21, lum: 0.62, shade: 0.25, falloff: 30, darken: 0.4, grain: 0.03, streaks: 0.3, peaks: true },
      { base: 0.77, amp: 0.045, freq: 3, seed: 25, lum: 0.42, shade: 0.14, falloff: 30, darken: 0.5, grain: 0.05, streaks: 0.16, peaks: true },
      { base: 0.89, amp: 0.035, freq: 1.4, seed: 29, lum: 0.22, shade: 0.06, falloff: 10, darken: 0.4, grain: 0.1 },
    ],
  },
};

function ridgeHeight(r, u) {
  const n = fbm(u * r.freq, r.seed * 0.37, r.seed, r.peaks ? 7 : 5);
  const shape = r.peaks ? Math.pow(1 - Math.abs(2 * n - 1), 1.6) : n; // ridged noise for mountains
  return r.base - r.amp * (shape * 2 - 0.5);
}

export function renderScene(key, w, h) {
  const sc = SCENES[key];
  const out = new Float32Array(w * h);
  const heights = sc.ridges.map((r) => {
    const a = new Float32Array(w);
    for (let x = 0; x < w; x++) a[x] = ridgeHeight(r, x / w);
    return a;
  });
  const slopes = heights.map((a) => {
    const s = new Float32Array(w), k = Math.max(1, Math.round(w / 400));
    for (let x = 0; x < w; x++) s[x] = (a[Math.min(w - 1, x + k)] - a[Math.max(0, x - k)]) * (w / (2 * k)) * 0.15;
    return s;
  });
  const aspect = w / h;
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      let l = sc.sky(u, v);
      if (sc.stars && v < sc.horizon && hash2(x, y, 77) > 1 - sc.stars / (w * 0.6)) l = 0.75 + 0.25 * hash2(x, y, 78);
      if (sc.disc) {
        const d = sc.disc, dx = (u - d.x) * aspect, dy = v - d.y;
        const r = Math.hypot(dx, dy);
        const lit = r < d.r && (!d.crescent || Math.hypot(dx + d.r * d.crescent, dy - d.r * 0.25) > d.r * 0.92);
        if (lit) l = d.lum;
        else l += 0.12 * Math.exp(-(((r / d.r - 1) * 1.2) ** 2)) * (d.crescent ? 0.6 : 1.4);
      }
      for (let i = sc.ridges.length - 1; i >= 0; i--) {
        const hgt = heights[i][x];
        if (v < hgt) continue;
        const r = sc.ridges[i], d = v - hgt;
        // The crest catches side light; the effect decays below the ridge
        // line, with streaks (gullies, wind ripples) carried down the face.
        const face = Math.tanh(slopes[i][x] * 4) * Math.exp(-d * r.falloff);
        // Surface relief: side-lit slope of a 2D noise field, sheared down the
        // face so gullies run diagonally instead of in vertical curtains.
        let streak = 0;
        if (r.streaks) {
          const fx = r.freq * 7, fy = r.freq * 5, e = 0.6 / w;
          const gx = fbm((u + e) * fx + d * 3, d * fy, r.seed + 3, 3) - fbm((u - e) * fx + d * 3, d * fy, r.seed + 3, 3);
          streak = r.streaks * Math.tanh(gx * w * 0.02) * Math.exp(-d * 3);
        }
        l = r.lum + r.shade * face + streak - r.darken * d + r.grain * (fbm(u * 90, v * 220, r.seed, 2) - 0.5);
        break;
      }
      out[y * w + x] = clamp01(l);
    }
  }
  const tree = sc.ridges.find((r) => r.tree);
  if (tree) drawTree(out, w, h, tree.tree, heights[sc.ridges.indexOf(tree)]);
  return out;
}

function drawTree(out, w, h, ux, ridge) {
  const cx = Math.round(ux * w), ground = ridge[cx] * h;
  const th = h * 0.2, trunkW = Math.max(2, w * 0.004);
  const blobs = [];
  for (let i = 0; i < 26; i++) {
    const a = hash2(i, 1, 4) * Math.PI, rr = hash2(i, 2, 4);
    blobs.push([cx + Math.cos(a) * th * 0.5 * rr, ground - th * 0.62 - Math.sin(a) * th * 0.35 * rr, th * (0.12 + 0.1 * hash2(i, 3, 4))]);
  }
  const y0 = Math.max(0, Math.floor(ground - th * 1.2)), y1 = Math.min(h, Math.ceil(ground + 2));
  const x0 = Math.max(0, Math.floor(cx - th * 0.8)), x1 = Math.min(w, Math.ceil(cx + th * 0.8));
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      let ink = y > ground - th * 0.5 && Math.abs(x - cx) < trunkW * (1.6 - (ground - y) / th);
      for (const [bx, by, br] of blobs) if (!ink && (x - bx) ** 2 + (y - by) ** 2 < br * br * (0.8 + 0.4 * valueNoise(x / 6, y / 6, 2))) ink = true;
      if (ink) out[y * w + x] = 0.1 + 0.06 * valueNoise(x / 3, y / 3, 8);
    }
}

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
export function quantize(c, bits) {
  const max = (1 << bits) - 1, out = new Uint8Array(c.length);
  for (let i = 0; i < c.length; i++) out[i] = Math.round((c[i] / 255) * max);
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

// Indexed PNG: every palette entry is the ink colour; tRNS carries the
// coverage ramp. The same file works as a CSS alpha mask (theme applies the
// colour) and as a plain pre-inked <img>.
export async function encodePNG(idx, w, h, bits, rgb = [0, 0, 0]) {
  const levels = 1 << bits, max = levels - 1;
  const raw = packRows(idx, w, h, bits);
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
