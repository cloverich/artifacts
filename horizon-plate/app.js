// Horizon Plate lab. Mechanics (tone, engrave, encodePNG, …) are defined in
// mechanics.mjs; build.mjs inlines them ahead of this file and replaces the
// photos/*.jpg paths with data URIs. Open dist/horizon-plate.html after
// `node build.mjs`.
//
// The preview is the shipped page: each plate has a fixed CSS width and is
// cropped by the screen. What you see is what Export saves.
//
// Position works like CSS object-position at both levels: the photo inside
// the plate, and the plate inside the screen (left: X%; translateX(-X%)).
// Composed, the photo's point at X% sits X% across every screen width, so a
// subject near the edge of the photo stays on screen.

const $ = (id) => document.getElementById(id);

// scale: compute pixels per CSS pixel. Lines and screens compute at 2 for
// export; the dither computes on its dot grid (one cell per dot, pixelated
// on screen); the ink map at ½, since continuous tone scales up smoothly and
// costs 4× fewer pixels. Mark sizes are CSS px and run down to one device
// pixel on a 2× screen; the default sits near the fine end.
const ALGOS = {
  engrave: { label: "Engrave", size: [1, 6, 0.25], init: 2, sizeLabel: "Line pitch", bits: 1, exportScale: 2,
    note: "Line width carries tone. Intaglio, banknotes, toile." },
  halftone: { label: "Halftone", size: [1.5, 8, 0.25], init: 2.5, sizeLabel: "Screen pitch", bits: 1, exportScale: 2,
    note: "Dot area carries tone on a rotated screen. Newsprint." },
  diffuse: { label: "Diffuse", size: [0.5, 3, 0.5], init: 1, sizeLabel: "Dot", bits: 1, grid: true,
    note: "Error diffusion. Organic grain that preserves tone. Dots under 1 px need a 2× screen." },
  scanline: { label: "Scanline", size: [1, 6, 0.25], init: 1.5, sizeLabel: "Row pitch", bits: 4, exportScale: 2,
    note: "Fixed rows whose brightness carries tone. Needs grey levels, so it costs bytes." },
  inkmap: { label: "Ink map", size: null, bits: 8, exportScale: 0.5, fixedScale: 0.5,
    note: "Continuous ink, no marks: the tone curve itself. Ships at half resolution; soft tone scales up cleanly." },
};

const PHOTOS = {
  sailboat: { label: "Sailboat", src: "photos/sailboat.jpg", title: "Sailboat under low cloud",
    where: "Salish Sea, Washington, on the way to Orcas Island", camera: "iPhone",
    crop: { wide: { ax: 0.89, ay: 0.9 }, narrow: { ax: 0.89, ay: 1 } } },
  sunset: { label: "Sunset", src: "photos/sunset.jpg", title: "Sunset over Lake Washington",
    where: "Lake Washington, Washington; a mountain range silhouetted on the far horizon", camera: "Mirrorless camera (OM System OM-5 or Sony; model unconfirmed)",
    crop: { wide: { ax: 0.5, ay: 0.98 }, narrow: { ax: 0.6, ay: 1 } } },
  forest: { label: "Forest", src: "photos/forest.jpg", title: "Fog on a disc golf course",
    where: "Washington; also used in xylo’s image lab", camera: "iPhone",
    crop: { wide: { ax: 0.5, ay: 0.85 }, narrow: { ax: 0.45, ay: 0.85 } } },
};

const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// Presets. The first three follow the reference footers (the grey grain
// stands in for the Finance footer's mezzotint); the rest are the
// two destinations, xylo and pinecoder.dev, in each of their modes.
const THEMES = {
  toile: { label: "Toile · cream and cobalt", bg: "#f5f1e6", text: "#22328a", muted: "#56609a", ink: "#2747c4", rule: "#d8d1bd", font: SERIF,
    photo: "sunset", algo: "engrave", size: 2, field: "wave", hatch: true, inkLight: false, lift: 0.4, fade: 0.2, contrast: 1.3, gamma: 1 },
  dune: { label: "Dusk · ultramarine and sand", bg: "#2a3a9e", text: "#f3efe4", muted: "#c9cdf0", ink: "#e7b46a", rule: "#5866bd", font: SANS,
    photo: "sunset", algo: "diffuse", size: 1, kernel: "atkinson", inkLight: false, lift: 0.18, fade: 0.2, contrast: 1, gamma: 1.2 },
  grain: { label: "Grain · grey", bg: "#cdcdca", text: "#1d1e1e", muted: "#484a49", ink: "#1b1c1c", rule: "#a2a39f", font: SANS,
    photo: "sailboat", algo: "diffuse", size: 0.5, kernel: "fs", inkLight: false, lift: 0.08, fade: 0.4, contrast: 1, gamma: 1.2 },
  xylo: { label: "xylo · soft black, neutral ink", bg: "#17181b", text: "#eceff5", muted: "#97a3bb", ink: "#c3cddd", rule: "#343b46", font: SANS,
    photo: "sunset", algo: "engrave", size: 2, field: "relief", hatch: false, inkLight: false, lift: 0.2, fade: 0.25, contrast: 1.1, gamma: 1.2 },
  xyloAmber: { label: "xylo · sodium amber scanline", bg: "#17181b", text: "#eceff5", muted: "#97a3bb", ink: "#e89b3c", rule: "#343b46", font: SANS,
    photo: "sunset", algo: "scanline", size: 1.5, inkLight: false, lift: 0.2, fade: 0.25, contrast: 1.1, gamma: 1.1 },
  pineLight: { label: "pinecoder · light", bg: "#f6f8fa", text: "#000000", muted: "#626975", ink: "#28292a", rule: "#d1d3d6", font: SANS,
    photo: "sailboat", algo: "inkmap", inkLight: false, lift: 0.1, fade: 0.3, contrast: 1.1, gamma: 1.1, wide: { height: 620, overlap: 0 } },
  pineDark: { label: "pinecoder · dark", bg: "#17181b", text: "#eceff5", muted: "#97a3bb", ink: "#a7baed", rule: "#343b46", font: SANS,
    photo: "sailboat", algo: "inkmap", inkLight: false, lift: 0.1, fade: 0.3, contrast: 1.1, gamma: 1.2, wide: { height: 620, overlap: 0 } },
};

const PLATE_DEFAULTS = {
  wide: { width: 2400, height: 380, overlap: 0.4, ax: 0.5, ay: 1, zoom: 1 },
  narrow: { width: 820, height: 300, overlap: 0.25, ax: 0.5, ay: 1, zoom: 1 },
};

const S = {
  source: { kind: "photo", key: "sunset" },
  plate: "wide",
  plates: structuredClone(PLATE_DEFAULTS),
  theme: "dune",
  algo: "diffuse",
  sizes: Object.fromEntries(Object.entries(ALGOS).map(([k, a]) => [k, a.init || 0])),
  field: "wave", hatch: true, angle: 45, kernel: "atkinson",
  inkLight: false, lift: 0.12, fade: 0.25, sides: 0, edge: "fade", contrast: 1, gamma: 1,
  tab: "footer", bits: "auto", format: "png",
  bg: "", ink: "", credit: "",
};
const P = () => S.plates[S.plate];

// Choosing a photo also frames it: each has a position that keeps its
// subject on screen in both plates.
function usePhoto(key) {
  S.source = { kind: "photo", key };
  for (const which of ["wide", "narrow"]) Object.assign(S.plates[which], { zoom: 1 }, PHOTOS[key].crop[which]);
}

// ── Sources ──────────────────────────────────────────────────────────────
const photoImages = new Map();
function photoImage(key) {
  if (!photoImages.has(key))
    photoImages.set(key, new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = PHOTOS[key].src;
    }));
  return photoImages.get(key);
}
const sourceImage = () => (S.source.kind === "file" ? Promise.resolve(S.source.img) : photoImage(S.source.key));
const sourceId = () => (S.source.kind === "file" ? "file:" + S.source.name : "photo:" + S.source.key);

// Cover-crop the source into the plate frame (W×H compute px), zoomed and
// anchored, and take Rec. 709 luminance. Zoom below 1 shrinks the photo
// past cover, so it no longer fills the frame; `rect` is the part it covers.
let lumCache = { key: "", lum: null, rect: null };
function luminance(src, W, H, p, cache = true) {
  const key = `${sourceId()}|${W}|${H}|${p.ax}|${p.ay}|${p.zoom}`;
  if (cache && lumCache.key === key) return lumCache;
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  const k = Math.max(W / sw, H / sh) * p.zoom, dw = sw * k, dh = sh * k;
  ctx.imageSmoothingQuality = "high";
  const ox = (W - dw) * p.ax, oy = (H - dh) * p.ay;
  ctx.drawImage(src, ox, oy, dw, dh);
  const rect = [Math.max(0, Math.ceil(ox)), Math.max(0, Math.ceil(oy)), Math.min(W, Math.floor(ox + dw)), Math.min(H, Math.floor(oy + dh))];
  const px = ctx.getImageData(0, 0, W, H).data, lum = new Float32Array(W * H);
  for (let i = 0, q = 0; i < lum.length; i++, q += 4) lum[i] = (0.2126 * px[q] + 0.7152 * px[q + 1] + 0.0722 * px[q + 2]) / 255;
  const r = { key, lum, rect };
  if (cache) lumCache = r;
  return r;
}

// ── Pipeline ─────────────────────────────────────────────────────────────
// Renders plate p at `scale` compute px per CSS px. Returns coverage at mask
// resolution and the CSS size that mask maps onto. The dither ignores
// `scale`: it samples the photo straight onto its dot grid, one pixel per
// dot, so a fine dot costs no more than the dots it draws.
const gridScale = () => 1 / S.sizes[S.algo];
function compute(src, p, scale, cache = true) {
  const a = ALGOS[S.algo], size = S.sizes[S.algo];
  if (a.grid) scale = gridScale();
  const W = a.grid ? Math.ceil(p.width * scale) : Math.max(1, Math.round(p.width * scale));
  const H = a.grid ? Math.ceil(p.height * scale) : Math.max(1, Math.round(p.height * scale));
  const ms = {}, t0 = performance.now();
  const { lum, rect } = luminance(src, W, H, p, cache);
  const t1 = performance.now();
  const t = tone(lum, W, H, { contrast: S.contrast, gamma: S.gamma, lift: S.lift, fade: S.fade, sides: S.sides, edge: S.edge, inkLight: S.inkLight, rect });
  const t2 = performance.now();
  let cov;
  if (a.grid) cov = diffuse(t, W, H, S.kernel);
  else if (S.algo === "engrave") cov = engrave(t, W, H, { pitch: size * scale, field: S.field, hatch: S.hatch });
  else if (S.algo === "halftone") cov = halftone(t, W, H, { pitch: size * scale, angle: (S.angle * Math.PI) / 180 });
  else if (S.algo === "scanline") cov = scanline(t, W, H, { pitch: Math.max(2, Math.round(size * scale)) });
  else { cov = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) cov[i] = t[i] * 255 + 0.5; }
  ms.crop = t1 - t0; ms.tone = t2 - t1; ms.marks = performance.now() - t2;
  const bits = S.bits === "auto" ? a.bits : +S.bits;
  return { cov, cw: W, ch: H, bits, ms, lum, W, H, cssW: W / scale, cssH: H / scale, scale };
}

// Level indices exactly as the PNG stores them; the preview paints these
// too, so it shows the quantized file, not the unquantized coverage.
// Continuous output dithers between levels; mark-making output is already
// near-binary and stays crisp.
function levels(r) {
  if (!r.q) {
    const smoothTone = S.algo === "inkmap" || S.algo === "scanline";
    r.q = quantize(r.cov, r.bits, smoothTone && r.bits < 8 ? r.cw : 0);
  }
  return r.q;
}

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);
const fmt = (n) => (n < 10 ? n.toFixed(1) : Math.round(n));

// WebP is lossy colour plus a losslessly compressed alpha plane. Safari's
// canvas cannot encode it and returns PNG instead, so check the type.
async function encode(r) {
  if (S.format === "webp") {
    const c = new OffscreenCanvas(r.cw, r.ch), ctx = c.getContext("2d"), img = ctx.createImageData(r.cw, r.ch), [ir, ig, ib] = hexRgb(S.ink);
    for (let i = 0; i < r.cov.length; i++) { img.data[i * 4] = ir; img.data[i * 4 + 1] = ig; img.data[i * 4 + 2] = ib; img.data[i * 4 + 3] = r.cov[i]; }
    ctx.putImageData(img, 0, 0);
    const blob = await c.convertToBlob({ type: "image/webp", quality: 0.8 });
    if (blob.type === "image/webp") return { blob, ext: "webp", label: "WebP" };
  }
  const png = await encodePNG(levels(r), r.cw, r.ch, r.bits, hexRgb(S.ink));
  return { blob: new Blob([png], { type: "image/png" }), ext: "png", label: `${1 << r.bits}-level PNG` };
}

// ── Preview ──────────────────────────────────────────────────────────────
// Only the active tab draws. The footer paints level indices straight into a
// canvas in the ink colour (what the mask would show), so dragging a slider
// never encodes or decodes a PNG; the file size is measured once the
// controls go still.
const plate = $("plate");
let token = 0, last = null, dirty = true, measureTimer = 0, dragging = false;

function previewScale() {
  const a = ALGOS[S.algo], p = P();
  if (a.fixedScale) return a.fixedScale;
  if (a.grid) return gridScale();
  // While a slider is held, lines and screens draft at 1× (a quarter of the
  // pixels on a 2× screen); releasing it renders full resolution.
  const dpr = dragging ? 1 : Math.min(2, window.devicePixelRatio || 1);
  return p.width * p.height * dpr * dpr <= 4e6 ? dpr : 1;
}

async function render() {
  if (S.tab === "notes") { dirty = true; return; }
  const my = ++token;
  const src = await sourceImage().catch(() => null);
  if (my !== token) return;
  if (!src) { $("readout").textContent = "The photo could not be loaded."; return; }
  const r = compute(src, P(), previewScale());
  const tp = performance.now();
  paintPlate(r);
  r.ms.paint = performance.now() - tp;
  last = r; dirty = false;
  if (S.tab === "image") drawImageTab();
  readout(r, null);
  updateSnippet();
  clearTimeout(measureTimer);
  if (!dragging) measureTimer = setTimeout(() => measure(r, my), 300);
}

async function measure(r, my) {
  const te = performance.now();
  const enc = await encode(r);
  if (my === token) readout(r, enc, performance.now() - te);
}

function readout(r, enc, encodeMs) {
  const total = Object.values(r.ms).reduce((s, v) => s + v, 0);
  const a = ALGOS[S.algo], exp = a.exportScale;
  const size = enc ? `${enc.label} · <b>${kb(enc.blob.size)}</b>` : `${1 << r.bits}-level PNG · measuring…`;
  $("readout").innerHTML =
    `${S.plate === "wide" ? "Wide" : "Narrow"} image <b>${Math.round(r.cssW)}×${Math.round(r.cssH)} CSS px</b> · preview <b>${r.cw}×${r.ch}</b> px · ${size}` +
    (r.scale !== exp && !a.grid ? ` (export at ${exp}× is larger)` : "") + "<br>" +
    `crop ${fmt(r.ms.crop)} ms · tone ${fmt(r.ms.tone)} · marks ${fmt(r.ms.marks)} · paint ${fmt(r.ms.paint)} · <b>${fmt(total)} ms</b>` +
    (enc ? ` · encode ${fmt(encodeMs)} ms` : "") + ` · the shipped page runs none of it`;
}

// Ink-coloured RGBA from level indices: one 32-bit write per pixel.
function paintPlate(r) {
  const q = levels(r), max = (1 << r.bits) - 1, [ir, ig, ib] = hexRgb(S.ink);
  const pal = new Uint32Array(max + 1);
  for (let i = 0; i <= max; i++) pal[i] = ((Math.round((i / max) * 255) << 24) | (ib << 16) | (ig << 8) | ir) >>> 0;
  if (plate.width !== r.cw || plate.height !== r.ch) { plate.width = r.cw; plate.height = r.ch; }
  const ctx = plate.getContext("2d"), img = ctx.createImageData(r.cw, r.ch), px = new Uint32Array(img.data.buffer);
  for (let i = 0; i < q.length; i++) px[i] = pal[q[i]];
  ctx.putImageData(img, 0, 0);
  plate.style.width = `${r.cssW}px`;
  plate.style.height = `${r.cssH}px`;
  plate.dataset.pixelated = String(!!ALGOS[S.algo].grid);
}

// Image tab: the whole plate with the slice each common screen shows, and
// the source photo with the plate's frame on it.
const SCREENS = { wide: [1280, 1440, 1920], narrow: [360, 390, 430, 768] };
function drawImageTab() {
  if (!last) return;
  const r = last, p = P(), accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const c = $("overview"), full = Math.max(1, Math.round(c.parentElement.clientWidth)), dpr = window.devicePixelRatio || 1;
  const screens = SCREENS[S.plate].filter((s) => s < r.cssW), ROW = 16;
  const w = full, h = Math.round((w * r.cssH) / r.cssW), H = h + 6 + screens.length * ROW;
  c.width = w * dpr; c.height = H * dpr;
  c.style.height = `${H}px`;
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.fillStyle = S.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = !ALGOS[S.algo].grid;
  ctx.drawImage(plate, 0, 0, w, h);
  // One row per screen: a bracket over the plate columns that screen shows.
  const k = w / r.cssW;
  ctx.strokeStyle = ctx.fillStyle = accent;
  ctx.font = "10px ui-monospace, Menlo, monospace";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 1;
  screens.forEach((s, i) => {
    const x0 = Math.round(p.ax * (r.cssW - s) * k) + 0.5, x1 = Math.round(x0 + s * k) - 1, y = h + 6 + i * ROW + ROW / 2;
    ctx.beginPath();
    ctx.moveTo(x0, y - 5); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y - 5);
    ctx.stroke();
    const label = `${s} px screen`, tw = ctx.measureText(label).width;
    const lx = Math.min(Math.max(x0 + 6, 0), w - tw - 6);
    ctx.clearRect(lx - 3, y - 6, tw + 6, 12);
    ctx.fillText(label, lx, y);
  });
  $("overviewCap").textContent = `The whole ${S.plate} image, ${Math.round(r.cssW)} × ${Math.round(r.cssH)} CSS px. Each bracket is the part a screen of that width shows; the screen crops the rest.`;
  drawSource();
}

function drawSource() {
  sourceImage().then((src) => {
    if (S.tab !== "image") return;
    const c = $("source"), p = P(), sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    // The frame in photo pixels: the inverse of the fit in luminance(). Zoomed
    // out, the frame is bigger than the photo, so fit the union of the two.
    const k = Math.max(p.width / sw, p.height / sh) * p.zoom, dw = sw * k, dh = sh * k;
    const fx = -((p.width - dw) * p.ax) / k, fy = -((p.height - dh) * p.ay) / k, fw = p.width / k, fh = p.height / k;
    const ux = Math.min(0, fx), uy = Math.min(0, fy), uw = Math.max(sw, fx + fw) - ux, uh = Math.max(sh, fy + fh) - uy;
    const dpr = window.devicePixelRatio || 1, maxW = c.parentElement.clientWidth;
    const f = Math.min(maxW / uw, (innerHeight * 0.55) / uh), w = Math.round(uw * f), h = Math.round(uh * f);
    c.width = w * dpr; c.height = h * dpr;
    c.style.width = `${w}px`; c.style.height = `${h}px`;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.translate(-ux * f, -uy * f);
    ctx.drawImage(src, 0, 0, sw * f, sh * f);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, sw * f, sh * f); ctx.clip();
    ctx.beginPath(); ctx.rect(0, 0, sw * f, sh * f); ctx.rect(fx * f, fy * f, fw * f, fh * f);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill("evenodd");
    ctx.restore();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fx * f + 0.75, fy * f + 0.75, fw * f - 1.5, fh * f - 1.5);
  });
}

let pending = 0;
function schedule() {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(() => render());
}

function setTab(tab) {
  S.tab = tab;
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  $("lab").hidden = tab === "notes";
  $("notes").hidden = tab !== "notes";
  $("viewFooter").hidden = tab !== "footer";
  $("viewImage").hidden = tab !== "image";
  if (tab === "notes") return;
  if (dirty) schedule();
  else if (tab === "image") drawImageTab();
}

function setPanel(open) {
  $("lab").classList.toggle("collapsed", !open);
  $("panel").hidden = !open;
  $("togglePanel").setAttribute("aria-expanded", String(open));
  $("togglePanel").textContent = open ? "Hide controls" : "Show controls";
  try { localStorage.setItem("horizon-plate:panel", open ? "open" : "closed"); } catch {}
}

// ── Export ───────────────────────────────────────────────────────────────
const exported = { wide: null, narrow: null };
const signature = (which) => JSON.stringify([sourceId(), S.plates[which], S.algo, S.sizes[S.algo], S.field, S.hatch, S.angle, S.kernel, S.inkLight, S.lift, S.fade, S.sides, S.edge, S.contrast, S.gamma, S.bits, S.format, S.ink]);

function plateDims(which) {
  const a = ALGOS[S.algo], p = S.plates[which], s = a.grid ? gridScale() : a.exportScale;
  if (a.grid) { const cw = Math.ceil(p.width * s), ch = Math.ceil(p.height * s); return { cw, ch, cssW: cw / s, cssH: ch / s }; }
  const W = Math.round(p.width * s), H = Math.round(p.height * s);
  return { cw: W, ch: H, cssW: W / s, cssH: H / s };
}

function snippetText() {
  const n = S.plates.narrow, w = S.plates.wide, dn = plateDims("narrow"), dw = plateDims("wide");
  const ext = S.format === "webp" ? "webp" : "png";
  const note = (which, d) => {
    const e = exported[which];
    return e && e.sig === signature(which) ? `${e.filename}: ${d.cw}×${d.ch}, ${kb(e.bytes)}` : `plate-${which}.${ext}: ${d.cw}×${d.ch}, export to measure`;
  };
  const pc = (v) => `${+(v * 100).toFixed(1)}%`;
  const pad = (p) => Math.round(p.height * (1 - p.overlap));
  const pix = ALGOS[S.algo].grid ? "\n  image-rendering: pixelated; /* keep dither dots square */" : "";
  return `/* Horizon plate, mobile first. Browsers fetch only the mask that applies.
   Masks load in CORS mode: serve them same-origin (or with CORS headers), not from file://.
   ${note("narrow", dn)}
   ${note("wide", dw)} */
.site-footer {
  position: relative; isolation: isolate; overflow: clip;
  min-height: ${dn.cssH}px; padding-bottom: ${pad(n)}px; /* text overlap: ${Math.round(n.overlap * 100)}% */
  content-visibility: auto; contain-intrinsic-size: auto ${Math.round(n.height + 240)}px;
}
.site-footer::before {
  content: ""; position: absolute; bottom: 0; z-index: -1;
  width: ${dn.cssW}px; height: ${dn.cssH}px;
  left: ${pc(n.ax)}; transform: translateX(-${pc(n.ax)}); /* position X: the photo's ${pc(n.ax)} point sits ${pc(n.ax)} across */
  background: ${S.ink}; /* or var(--ink): colour comes from CSS */
  -webkit-mask: url(plate-narrow.${ext}) 0 0 / 100% 100% no-repeat;
          mask: url(plate-narrow.${ext}) 0 0 / 100% 100% no-repeat;${pix}
  pointer-events: none;
}
@media (min-width: ${n.width}px) {
  .site-footer { min-height: ${dw.cssH}px; padding-bottom: ${pad(w)}px; contain-intrinsic-size: auto ${Math.round(w.height + 240)}px; }
  .site-footer::before {
    width: ${dw.cssW}px; height: ${dw.cssH}px;
    left: ${pc(w.ax)}; transform: translateX(-${pc(w.ax)});
    -webkit-mask-image: url(plate-wide.${ext});
            mask-image: url(plate-wide.${ext});
  }
}`;
}

function updateSnippet() {
  $("snippet").textContent = snippetText();
  const a = ALGOS[S.algo], d = plateDims(S.plate);
  $("exportNote").textContent = `The ${S.plate} image ships ${d.cw}×${d.ch} px (${a.grid ? "one pixel per dot" : a.exportScale === 2 ? "2× for sharp lines" : "½× of CSS size"}). The narrow image is used below ${S.plates.narrow.width} px; the wide one from there up.`;
}

const downloadsReady = window.claude?.use ? window.claude.use("downloads").catch(() => null) : Promise.resolve(undefined);

async function exportPlate() {
  const btn = $("download"), which = S.plate;
  btn.disabled = true;
  btn.textContent = "Rendering…";
  await new Promise((r) => setTimeout(r, 30));
  try {
    const src = await sourceImage();
    const r = compute(src, S.plates[which], ALGOS[S.algo].exportScale, false);
    const enc = await encode(r);
    const filename = `plate-${which}.${enc.ext}`;
    exported[which] = { filename, bytes: enc.blob.size, sig: signature(which) };
    updateSnippet();
    const dl = await downloadsReady;
    const done = `Saved ${filename}: ${r.cw}×${r.ch}, ${kb(enc.blob.size)}.`;
    if (dl === undefined) {
      // Opened from disk or a plain web server: an ordinary download link.
      const a = document.createElement("a");
      a.href = URL.createObjectURL(enc.blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      $("exportNote").textContent = done;
    } else if (dl) {
      await dl.save({ filename, data: enc.blob });
      $("exportNote").textContent = done;
    } else {
      $("exportNote").textContent = `Rendered ${filename} (${kb(enc.blob.size)}). Saving files is not available in this view; open the lab from the artifacts repository to download.`;
    }
  } catch (err) {
    $("exportNote").textContent = err?.code === "declined" ? "Export cancelled." : `Export failed: ${err?.message || err}`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Export PNG";
  }
}

async function copyText(text, btn, label) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
  } catch {
    // No clipboard permission: show the text selected, ready to copy by hand.
    $("snippet").textContent = text;
    const range = document.createRange();
    range.selectNodeContents($("snippet"));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    btn.textContent = "Selected";
  }
  setTimeout(() => (btn.textContent = label), 1400);
}

// Recipe: every setting that shapes the plates, as JSON. Text survives a
// chat or a commit where a 1-bit PNG would be re-encoded, and with the
// source photo it reproduces both exports exactly (paste it here, or call
// applyRecipe() headless). The photo itself is referenced by name only.
const RECIPE_KEYS = ["theme", "algo", "field", "hatch", "angle", "kernel", "inkLight", "lift", "fade", "sides", "edge", "contrast", "gamma", "bits", "format", "bg", "ink", "credit"];
function recipe() {
  const r = { horizonPlate: 1, source: S.source.kind === "photo" ? S.source.key : S.source.name.split(":")[0] };
  for (const k of RECIPE_KEYS) r[k] = S[k];
  r.size = S.sizes[S.algo];
  r.plates = structuredClone(S.plates);
  return r;
}
function applyRecipe(r) {
  if (!r || r.horizonPlate !== 1) return false;
  if (r.theme in THEMES) S.theme = r.theme;
  if (r.algo in ALGOS) for (const k of RECIPE_KEYS) if (k in r) S[k] = r[k];
  if (r.size) S.sizes[S.algo] = r.size;
  for (const which of ["wide", "narrow"]) Object.assign(S.plates[which], r.plates?.[which]);
  if (r.source in PHOTOS && S.source.kind === "photo") S.source = { kind: "photo", key: r.source };
  sync(); schedule();
  return true;
}
window.applyRecipe = applyRecipe;

// ── Controls ─────────────────────────────────────────────────────────────
const segs = [], ranges = [];
function seg(id, options, get, set) {
  const el = $(id);
  el.innerHTML = "";
  for (const [key, label] of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.dataset.key = key;
    b.addEventListener("click", () => { set(key); sync(); schedule(); });
    el.append(b);
  }
  el.sync = () => el.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.key === String(get()))));
  segs.push(id);
}
function range(id, get, set, show) {
  const el = $(id), out = $(id + "Out");
  el.addEventListener("input", () => { set(+el.value); out.textContent = show(+el.value); paintSite(); schedule(); });
  el.sync = () => { el.value = get(); out.textContent = show(get()); };
  ranges.push(id);
}
const pct = (v) => `${Math.round(v * 100)}%`;

// A theme is a full preset on the sample photos. On your own image it only
// recolours the page: framing and tone stay, so light and dark can share them.
function applyTheme(key) {
  const th = THEMES[key];
  S.theme = key;
  S.bg = th.bg; S.ink = th.ink;
  if (S.source.kind === "file") return;
  Object.assign(S, { algo: th.algo, inkLight: th.inkLight, lift: th.lift, fade: th.fade, sides: th.sides || 0, contrast: th.contrast, gamma: th.gamma });
  if (th.size) S.sizes[th.algo] = th.size;
  for (const k of ["field", "hatch", "angle", "kernel"]) if (k in th) S[k] = th[k];
  S.plates = structuredClone(PLATE_DEFAULTS);
  Object.assign(S.plates.wide, th.wide);
  if (S.source.kind === "photo") usePhoto(th.photo);
}

function paintSite() {
  const th = THEMES[S.theme], site = $("site"), p = P();
  site.style.setProperty("--p-bg", S.bg);
  site.style.setProperty("--p-ink", S.ink);
  site.style.setProperty("--p-text", th.text);
  site.style.setProperty("--p-muted", th.muted);
  site.style.setProperty("--p-rule", th.rule);
  site.style.setProperty("--p-font", th.font);
  site.style.setProperty("--plate-h", p.height + "px");
  site.style.setProperty("--overlap", p.overlap);
  site.style.setProperty("--x", p.ax);
  site.dataset.screen = S.plate;
  $("footCredit").textContent = S.credit;
  $("footCredit").hidden = !S.credit;
}

function sync() {
  segs.forEach((s) => $(s).sync());
  ranges.forEach((r) => $(r).sync());
  const a = ALGOS[S.algo], size = $("size");
  $("sizeRow").hidden = !a.size;
  if (a.size) {
    size.min = a.size[0]; size.max = a.size[1]; size.step = a.size[2];
    size.value = S.sizes[S.algo];
    $("sizeLabel").textContent = a.sizeLabel;
    $("sizeOut").textContent = `${S.sizes[S.algo]} px`;
  }
  $("algoNote").textContent = a.note;
  document.querySelectorAll(".sub").forEach((el) => (el.hidden = el.dataset.for !== S.algo));
  $("hatch").checked = S.hatch;
  $("theme").value = S.theme;
  $("bg").value = S.bg;
  $("ink").value = S.ink;
  $("bits").value = S.bits;
  $("credit").value = S.credit;
  $("format").value = S.format;
  const wsel = $("plateW");
  wsel.innerHTML = "";
  for (const v of S.plate === "wide" ? [1600, 2400, 3200] : [600, 820, 1024]) wsel.add(new Option(`${v} px`, v));
  wsel.value = P().width;
  $("screenNote").textContent = S.plate === "wide"
    ? `Shown on screens ${S.plates.narrow.width} px and wider; the screen crops it. The Image tab shows all of it.`
    : `Shown below ${S.plates.narrow.width} px. The Footer tab frames it at phone width, 390 px.`;
  paintSite();
}

// Colour only: repaint the cached levels, no pipeline run.
let repaintFrame = 0;
function repaintSoon() {
  cancelAnimationFrame(repaintFrame);
  repaintFrame = requestAnimationFrame(() => {
    if (!last) return;
    paintPlate(last);
    if (S.tab === "image") drawImageTab();
    updateSnippet();
  });
}

function initControls() {
  seg("photos", Object.entries(PHOTOS).map(([k, p]) => [k, p.label]),
    () => (S.source.kind === "photo" ? S.source.key : ""),
    (k) => { usePhoto(k); $("dropText").innerHTML = "<b>Drop, paste, or choose an image.</b> It stays in this browser."; });
  seg("algos", Object.entries(ALGOS).map(([k, a]) => [k, a.label]), () => S.algo, (k) => (S.algo = k));
  seg("fields", [["flat", "Flat"], ["wave", "Guilloché"], ["relief", "Relief"]], () => S.field, (k) => (S.field = k));
  seg("kernels", [["atkinson", "Atkinson"], ["fs", "Floyd–Steinberg"]], () => S.kernel, (k) => (S.kernel = k));
  seg("polarity", [["false", "Ink the shadows"], ["true", "Ink the light"]], () => S.inkLight, (k) => (S.inkLight = k === "true"));
  seg("edges", [["fade", "Fade"], ["glitch", "Tear"]], () => S.edge, (k) => (S.edge = k));
  seg("plates", [["wide", "Wide"], ["narrow", "Narrow"]], () => S.plate, (k) => (S.plate = k));

  range("angle", () => S.angle, (v) => (S.angle = v), (v) => `${v}°`);
  range("lift", () => S.lift, (v) => (S.lift = v), pct);
  range("fade", () => S.fade, (v) => (S.fade = v), pct);
  range("sides", () => S.sides, (v) => (S.sides = v), pct);
  range("contrast", () => S.contrast, (v) => (S.contrast = v), (v) => v.toFixed(2));
  range("gamma", () => S.gamma, (v) => (S.gamma = v), (v) => v.toFixed(2));
  range("plateH", () => P().height, (v) => (P().height = v), (v) => `${v} px`);
  range("overlap", () => P().overlap, (v) => (P().overlap = v), pct);
  range("ax", () => P().ax, (v) => (P().ax = v), pct);
  range("ay", () => P().ay, (v) => (P().ay = v), pct);
  range("zoom", () => P().zoom, (v) => (P().zoom = v), (v) => `${v.toFixed(2)}×`);

  $("size").addEventListener("input", (e) => { S.sizes[S.algo] = +e.target.value; $("sizeOut").textContent = `${S.sizes[S.algo]} px`; schedule(); });
  $("hatch").addEventListener("change", (e) => { S.hatch = e.target.checked; schedule(); });
  const themeSel = $("theme");
  for (const [k, th] of Object.entries(THEMES)) themeSel.add(new Option(th.label, k));
  themeSel.addEventListener("change", () => { applyTheme(themeSel.value); sync(); schedule(); });
  $("bg").addEventListener("input", (e) => { S.bg = e.target.value; paintSite(); if (S.tab === "image") repaintSoon(); });
  $("ink").addEventListener("input", (e) => { S.ink = e.target.value; paintSite(); repaintSoon(); });
  $("credit").addEventListener("input", (e) => { S.credit = e.target.value; paintSite(); });
  $("bits").addEventListener("change", (e) => { S.bits = e.target.value; schedule(); });
  $("format").addEventListener("change", (e) => { S.format = e.target.value; schedule(); });
  $("plateW").addEventListener("change", (e) => { P().width = +e.target.value; sync(); schedule(); });
  $("download").addEventListener("click", exportPlate);
  document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("togglePanel").addEventListener("click", () => setPanel($("panel").hidden));
  $("copy").addEventListener("click", () => copyText(snippetText(), $("copy"), "Copy CSS"));
  $("copyRecipe").addEventListener("click", () => copyText(JSON.stringify(recipe(), null, 1), $("copyRecipe"), "Copy recipe"));

  // Image input: file picker, drag and drop anywhere on the bench, paste.
  const load = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      S.source = { kind: "file", name: `${file.name}:${file.size}:${file.lastModified}`, img };
      $("dropText").textContent = "";
      const b = document.createElement("b");
      b.textContent = file.name;
      $("dropText").append(b, ` · ${img.naturalWidth}×${img.naturalHeight}. Choose a photo to switch back.`);
      sync(); schedule();
    };
    img.onerror = () => ($("dropText").innerHTML = "<b>That file could not be read as an image.</b> Try a JPEG, PNG, or WebP.");
    img.src = URL.createObjectURL(file);
  };
  $("file").addEventListener("change", (e) => load(e.target.files[0]));
  const drop = $("drop");
  for (const el of [drop, $("site")]) {
    el.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
    el.addEventListener("dragleave", () => drop.classList.remove("over"));
    el.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); load(e.dataTransfer.files[0]); });
  }
  window.addEventListener("paste", (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (item) return load(item.getAsFile());
    if (e.target.closest?.("input, select, textarea")) return;
    try { if (applyRecipe(JSON.parse(e.clipboardData.getData("text")))) $("exportNote").textContent = "Recipe applied. Drop the matching photo if it is your own."; } catch {}
  });
  $("panel").addEventListener("pointerdown", (e) => { if (e.target.type === "range") dragging = true; });
  window.addEventListener("pointerup", () => { if (dragging) { dragging = false; schedule(); } });
  window.addEventListener("pointercancel", () => { if (dragging) { dragging = false; schedule(); } });
  // The Image tab follows the stage width.
  let lastW = 0;
  new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w !== lastW) { lastW = w; if (S.tab === "image") drawImageTab(); } }).observe(document.querySelector(".stage"));
}

function renderCredits() {
  const list = $("credits");
  for (const p of Object.values(PHOTOS)) {
    const li = document.createElement("li");
    li.innerHTML = `<b></b><span></span>`;
    li.querySelector("b").textContent = p.title;
    li.querySelector("span").textContent = ` · ${p.where}. ${p.camera}.`;
    list.append(li);
  }
}

applyTheme(S.theme);
initControls();
renderCredits();
sync();
setTab(S.tab);
setPanel((() => { try { return localStorage.getItem("horizon-plate:panel") !== "closed"; } catch { return true; } })());
$("readout").textContent = "Loading the sample photo…";
schedule();
