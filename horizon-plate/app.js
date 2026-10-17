// Horizon Plate lab. Mechanics (renderScene, tone, engrave, …) are defined
// in mechanics.mjs; build.mjs inlines them ahead of this file. During
// development, open dist/horizon-plate.html after `node build.mjs`.

const $ = (id) => document.getElementById(id);

const ALGOS = {
  engrave: { label: "Engrave", size: [2, 8, 0.5], sizeLabel: "Line pitch", grid: false, bits: 1,
    note: "Line width carries tone. Intaglio, banknotes, toile." },
  halftone: { label: "Halftone", size: [2, 10, 0.5], sizeLabel: "Screen pitch", grid: false, bits: 1,
    note: "Dot area carries tone on a rotated screen. Newsprint." },
  bayer: { label: "Bayer", size: [1, 4, 1], sizeLabel: "Dot", grid: true, bits: 1,
    note: "Ordered 8×8 threshold. A visible crosshatch; early screens." },
  diffuse: { label: "Diffuse", size: [1, 4, 1], sizeLabel: "Dot", grid: true, bits: 1,
    note: "Error diffusion. Organic grain that preserves tone." },
  mezzotint: { label: "Mezzotint", size: [1, 4, 1], sizeLabel: "Grain", grid: true, bits: 1,
    note: "Random threshold. Pure grain, no structure." },
  scanline: { label: "Scanline", size: [2, 8, 0.5], sizeLabel: "Row pitch", grid: false, bits: 4,
    note: "Fixed rows whose brightness carries tone. Needs grey levels, so it costs bytes." },
  ascii: { label: "ASCII", size: [5, 14, 1], sizeLabel: "Glyph width", grid: false, bits: 1,
    note: "Cell brightness picks a glyph from “ .,:;-=+*#%@”." },
};

const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// Presets. The first three follow the reference footers; the rest are the
// two destinations, xylo and pinecoder.dev, in each of their modes.
const THEMES = {
  toile: { label: "Toile · cream and cobalt", bg: "#f5f1e6", text: "#22328a", muted: "#56609a", ink: "#2747c4", rule: "#d8d1bd", font: SERIF,
    scene: "hills", algo: "engrave", size: 3, field: "wave", hatch: true, inkLight: false, lift: 0.16, fade: 0.3, contrast: 1.15, gamma: 1.1 },
  dune: { label: "Night dune · ultramarine and sand", bg: "#2a3a9e", text: "#f3efe4", muted: "#c9cdf0", ink: "#e7b46a", rule: "#5866bd", font: SANS,
    scene: "dunes", algo: "diffuse", size: 2, kernel: "atkinson", inkLight: true, lift: 0.14, fade: 0.25, contrast: 0.9, gamma: 1.5 },
  mezzo: { label: "Mezzotint · grey grain", bg: "#cdcdca", text: "#1d1e1e", muted: "#484a49", ink: "#1b1c1c", rule: "#a2a39f", font: SANS,
    scene: "hills", algo: "mezzotint", size: 1, inkLight: false, lift: 0.06, fade: 0.4, contrast: 1, gamma: 1.25 },
  xylo: { label: "xylo · soft black, neutral ink", bg: "#17181b", text: "#eceff5", muted: "#97a3bb", ink: "#c3cddd", rule: "#343b46", font: SANS,
    scene: "range", algo: "engrave", size: 3, field: "relief", hatch: false, inkLight: false, lift: 0.12, fade: 0.3, contrast: 1.1, gamma: 1.2 },
  xyloAmber: { label: "xylo · sodium amber scanline", bg: "#17181b", text: "#eceff5", muted: "#97a3bb", ink: "#e89b3c", rule: "#343b46", font: SANS,
    scene: "dunes", algo: "scanline", size: 3, inkLight: true, lift: 0.18, fade: 0.25, contrast: 1.2, gamma: 1.1 },
  pineLight: { label: "pinecoder · light", bg: "#f6f8fa", text: "#000000", muted: "#626975", ink: "#28292a", rule: "#d1d3d6", font: SANS,
    scene: "range", algo: "halftone", size: 4, angle: 45, inkLight: false, lift: 0.2, fade: 0.3, contrast: 1.1, gamma: 1.1 },
  // Dark mode can't reuse the light plate's polarity: inking the shadows of a
  // day scene in a light ink gives a negative. This preset inks the light of
  // a night scene instead, a photographic positive.
  pineDark: { label: "pinecoder · dark", bg: "#17181b", text: "#eceff5", muted: "#97a3bb", ink: "#a7baed", rule: "#343b46", font: SANS,
    scene: "dunes", algo: "halftone", size: 4, angle: 45, inkLight: true, lift: 0.14, fade: 0.25, contrast: 1, gamma: 1.4 },
};

const S = {
  source: { kind: "scene", key: "dunes" },
  anchor: 0.85,
  theme: "dune",
  algo: "diffuse",
  sizes: Object.fromEntries(Object.entries(ALGOS).map(([k, a]) => [k, a.size[0] + (a.grid ? 1 : 1.5)])),
  field: "wave", hatch: true, angle: 45, kernel: "atkinson",
  inkLight: true, lift: 0.12, fade: 0.25, contrast: 1, gamma: 1,
  plateH: 380, overlap: 0.42, view: "plate", bits: "auto", exportW: 2400,
  bg: "", ink: "",
};

// ── Sources ──────────────────────────────────────────────────────────────
const sceneCanvases = new Map();
function sceneCanvas(key) {
  if (sceneCanvases.has(key)) return sceneCanvases.get(key);
  const w = 1400, h = 640, lum = renderScene(key, w, h);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d"), img = ctx.createImageData(w, h);
  for (let i = 0; i < lum.length; i++) {
    const v = lum[i] * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  sceneCanvases.set(key, c);
  return c;
}
const sourceImage = () => (S.source.kind === "file" ? S.source.img : sceneCanvas(S.source.key));
const sourceId = () => (S.source.kind === "file" ? "file:" + S.source.name : "scene:" + S.source.key);

// Cover-crop the source to W×H, anchored vertically, and take luminance.
let lumCache = { key: "", lum: null };
function luminance(W, H, cache = true) {
  const key = `${sourceId()}|${W}|${H}|${S.anchor}`;
  if (cache && lumCache.key === key) return lumCache.lum;
  const src = sourceImage();
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  const k = Math.max(W / sw, H / sh), dw = sw * k, dh = sh * k;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, (W - dw) / 2, (H - dh) * S.anchor, dw, dh);
  const px = ctx.getImageData(0, 0, W, H).data, lum = new Float32Array(W * H);
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) lum[i] = (0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2]) / 255;
  if (cache) lumCache = { key, lum };
  return lum;
}

// ── Pipeline ─────────────────────────────────────────────────────────────
// Returns coverage at mask resolution plus how many device pixels one mask
// pixel spans (1 for full-resolution algorithms, the cell for dithers).
function compute(W, H, dpr, cache = true) {
  const a = ALGOS[S.algo], size = S.sizes[S.algo];
  const ms = {}, t0 = performance.now();
  const lum = luminance(W, H, cache);
  const t1 = performance.now();
  const t = tone(lum, W, H, { contrast: S.contrast, gamma: S.gamma, lift: S.lift, fade: S.fade, inkLight: S.inkLight });
  const t2 = performance.now();
  let cov, cw = W, ch = H, cell = 1;
  if (a.grid) {
    cell = Math.max(1, Math.round(size * dpr));
    const d = downsample(t, W, H, cell);
    cw = d.gw; ch = d.gh;
    cov = S.algo === "bayer" ? bayer(d.g, cw, ch) : S.algo === "diffuse" ? diffuse(d.g, cw, ch, S.kernel) : mezzotint(d.g, cw, ch);
  } else if (S.algo === "engrave") cov = engrave(t, W, H, { pitch: size * dpr, field: S.field, hatch: S.hatch });
  else if (S.algo === "halftone") cov = halftone(t, W, H, { pitch: size * dpr, angle: (S.angle * Math.PI) / 180 });
  else if (S.algo === "scanline") cov = scanline(t, W, H, { pitch: Math.max(2, Math.round(size * dpr)) });
  else cov = asciiPlate(t, W, H, size * dpr);
  const t3 = performance.now();
  ms.source = t1 - t0; ms.tone = t2 - t1; ms.marks = t3 - t2;
  const bits = S.bits === "auto" ? a.bits : +S.bits;
  return { cov, cw, ch, cell, bits, ms, t, lum };
}

function asciiPlate(t, W, H, glyphW) {
  const cw = Math.max(3, Math.round(glyphW)), ch = Math.round(cw * 1.7);
  const { g, gw, gh } = downsample(t, W, H, cw, ch);
  const cells = asciiCells(g, gw, gh);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.font = `${Math.round(ch * 0.92)}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fff";
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const k = cells[y * gw + x];
      if (k) ctx.fillText(ASCII_RAMP[k], x * cw, y * ch);
    }
  const px = ctx.getImageData(0, 0, W, H).data, cov = new Uint8Array(W * H);
  for (let i = 0; i < cov.length; i++) cov[i] = px[i * 4 + 3];
  return cov;
}

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);
const fmt = (n) => (n < 10 ? n.toFixed(1) : Math.round(n));

// ── Preview render ───────────────────────────────────────────────────────
const plate = $("plate"), inspect = $("inspect");
let token = 0, maskUrl = "", lastPreview = null;

async function render() {
  const my = ++token;
  const rect = plate.getBoundingClientRect();
  if (rect.width < 10) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.round(rect.width * dpr), H = Math.round(rect.height * dpr);
  const r = compute(W, H, dpr);
  const te = performance.now();
  const png = await encodePNG(quantize(r.cov, r.bits), r.cw, r.ch, r.bits, hexRgb(S.ink));
  r.ms.encode = performance.now() - te;
  if (my !== token) return;
  const url = URL.createObjectURL(new Blob([png], { type: "image/png" }));
  plate.style.setProperty("--mask", `url("${url}")`);
  plate.style.setProperty("--mask-size", `${(r.cw * r.cell) / dpr}px ${(r.ch * r.cell) / dpr}px`);
  plate.dataset.pixelated = String(ALGOS[S.algo].grid);
  if (maskUrl) URL.revokeObjectURL(maskUrl);
  maskUrl = url;
  lastPreview = { ...r, bytes: png.length, W, H, dpr };
  drawInspect(r, W, H);
  const total = Object.values(r.ms).reduce((s, v) => s + v, 0);
  $("readout").innerHTML =
    `Preview mask <b>${r.cw}×${r.ch}</b> · ${r.cell > 1 ? `${r.cell}px dots, pixelated` : `${dpr}× device`} · <b>${1 << r.bits} levels</b> · <b>${kb(png.length)}</b><br>` +
    `crop ${fmt(r.ms.source)} ms · tone ${fmt(r.ms.tone)} · marks ${fmt(r.ms.marks)} · encode ${fmt(r.ms.encode)} · <b>${fmt(total)} ms</b> once; 0 ms per scroll`;
  updateSnippet();
}

function drawInspect(r, W, H) {
  inspect.hidden = S.view === "plate";
  plate.style.visibility = S.view === "plate" ? "" : "hidden"; // keep its box: it is the size probe
  if (S.view === "plate") return;
  inspect.width = W; inspect.height = H;
  const ctx = inspect.getContext("2d"), img = ctx.createImageData(W, H), [ir, ig, ib] = hexRgb(S.ink);
  for (let i = 0; i < W * H; i++) {
    const p = i * 4;
    if (S.view === "tone") { img.data[p] = ir; img.data[p + 1] = ig; img.data[p + 2] = ib; img.data[p + 3] = r.t[i] * 255; }
    else { img.data[p] = img.data[p + 1] = img.data[p + 2] = r.lum[i] * 255; img.data[p + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0);
}

let pending = 0;
function schedule() {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(() => render());
}

// ── Export ───────────────────────────────────────────────────────────────
// Dithers ship at their dot grid (1 mask px per dot) and scale up with
// pixelated sampling; continuous algorithms ship at 2× for sharp lines.
function exportSpec() {
  const grid = ALGOS[S.algo].grid, k = grid ? 1 : 2;
  return { grid, k, W: S.exportW * k, H: S.plateH * k };
}

function snippetText(e) {
  const name = "plate.png";
  const cssW = e ? (e.cw * e.cell) / e.k : S.exportW, cssH = e ? (e.ch * e.cell) / e.k : S.plateH;
  const head = e ? `/* ${name}: ${e.cw}×${e.ch}, ${1 << e.bits} levels, ${kb(e.bytes)} */` : `/* ${name}: export to see dimensions and size */`;
  return `${head}
.site-footer { position: relative; isolation: isolate; }
.site-footer::before {
  content: ""; position: absolute; inset: auto 0 0; z-index: -1;
  height: ${Math.round(cssH)}px; pointer-events: none;
  background: ${S.ink}; /* or var(--ink): the PNG holds no colour you need */
  -webkit-mask: url(${name}) 50% 100% / ${Math.round(cssW)}px ${Math.round(cssH)}px no-repeat;
          mask: url(${name}) 50% 100% / ${Math.round(cssW)}px ${Math.round(cssH)}px no-repeat;${ALGOS[S.algo].grid ? "\n  image-rendering: pixelated; /* keep dither dots square */" : ""}
}
.site-footer { content-visibility: auto; contain-intrinsic-size: auto ${Math.round(cssH + 200)}px; }`;
}
let lastExport = null;
function updateSnippet() {
  const e = exportSpec();
  const fresh = lastExport && lastExport.sig === signature() ? lastExport : null;
  $("snippet").textContent = snippetText(fresh);
  $("exportNote").textContent = e.grid
    ? `Ships ${Math.ceil(S.exportW / S.sizes[S.algo])}×${Math.ceil(S.plateH / S.sizes[S.algo])}: one pixel per dot, centred and cropped on narrower screens.`
    : `Ships ${e.W}×${e.H} at 2× for sharp lines on high-density screens, centred and cropped on narrower screens.`;
}
const signature = () => JSON.stringify([sourceId(), S.anchor, S.algo, S.sizes[S.algo], S.field, S.hatch, S.angle, S.kernel, S.inkLight, S.lift, S.fade, S.contrast, S.gamma, S.plateH, S.bits, S.exportW, S.ink]);

const downloadsReady = window.claude?.use ? window.claude.use("downloads").catch(() => null) : Promise.resolve(undefined);

async function exportPNG() {
  const btn = $("download");
  btn.disabled = true;
  btn.textContent = "Rendering…";
  await new Promise((r) => setTimeout(r, 30));
  try {
    const e = exportSpec();
    const r = compute(e.W, e.H, e.k, false);
    const png = await encodePNG(quantize(r.cov, r.bits), r.cw, r.ch, r.bits, hexRgb(S.ink));
    lastExport = { ...r, k: e.k, bytes: png.length, sig: signature() };
    updateSnippet();
    const filename = `plate-${S.algo}-${r.cw}x${r.ch}.png`;
    const dl = await downloadsReady;
    if (dl === undefined) {
      // Opened from disk or a plain web server: an ordinary download link.
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([png], { type: "image/png" }));
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      $("exportNote").textContent = `Saved ${filename} (${kb(png.length)}).`;
    } else if (dl) {
      await dl.save({ filename, data: new Blob([png]) });
      $("exportNote").textContent = `Saved ${filename} (${kb(png.length)}).`;
    } else {
      $("exportNote").textContent = `Rendered ${r.cw}×${r.ch}, ${kb(png.length)}. Saving files is not available in this view; open the lab from the artifacts repository to download.`;
    }
  } catch (err) {
    $("exportNote").textContent = err?.code === "declined" ? "Export cancelled." : `Export failed: ${err?.message || err}`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Export PNG";
  }
}

async function copyCSS() {
  const text = $("snippet").textContent;
  try {
    await navigator.clipboard.writeText(text);
    $("copy").textContent = "Copied";
  } catch {
    const range = document.createRange();
    range.selectNodeContents($("snippet"));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    $("copy").textContent = "Selected";
  }
  setTimeout(() => ($("copy").textContent = "Copy CSS"), 1400);
}

// ── Controls ─────────────────────────────────────────────────────────────
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
}

function range(id, get, set, show) {
  const el = $(id), out = $(id + "Out");
  el.addEventListener("input", () => { set(+el.value); out.textContent = show(+el.value); schedule(); });
  el.sync = () => { el.value = get(); out.textContent = show(get()); };
}

const pct = (v) => `${Math.round(v * 100)}%`;
const segs = [];
const ranges = [];

function applyTheme(key, { keepSource = false } = {}) {
  const th = THEMES[key];
  S.theme = key;
  S.bg = th.bg; S.ink = th.ink;
  Object.assign(S, { algo: th.algo, inkLight: th.inkLight, lift: th.lift, fade: th.fade, contrast: th.contrast, gamma: th.gamma });
  S.sizes[th.algo] = th.size;
  for (const k of ["field", "hatch", "angle", "kernel"]) if (k in th) S[k] = th[k];
  if (!keepSource && S.source.kind === "scene") S.source = { kind: "scene", key: th.scene };
  paintSite();
}

function paintSite() {
  const th = THEMES[S.theme], site = $("site");
  site.style.setProperty("--p-bg", S.bg);
  site.style.setProperty("--p-ink", S.ink);
  site.style.setProperty("--p-text", th.text);
  site.style.setProperty("--p-muted", th.muted);
  site.style.setProperty("--p-rule", th.rule);
  site.style.setProperty("--p-font", th.font);
  site.style.setProperty("--plate-h", S.plateH + "px");
  site.style.setProperty("--overlap", S.overlap);
}

function sync() {
  segs.forEach((s) => $(s).sync());
  ranges.forEach((r) => $(r).sync());
  const a = ALGOS[S.algo], size = $("size");
  size.min = a.size[0]; size.max = a.size[1]; size.step = a.size[2];
  size.value = S.sizes[S.algo];
  $("sizeLabel").textContent = a.sizeLabel;
  $("sizeOut").textContent = `${S.sizes[S.algo]} px`;
  $("algoNote").textContent = a.note;
  document.querySelectorAll(".sub").forEach((el) => (el.hidden = el.dataset.for !== S.algo));
  $("hatch").checked = S.hatch;
  $("theme").value = S.theme;
  $("bg").value = S.bg;
  $("ink").value = S.ink;
  $("bits").value = S.bits;
  $("exportW").value = S.exportW;
  paintSite();
}

function initControls() {
  seg("scenes", [...Object.entries(SCENES).map(([k, s]) => [k, s.label.split(",")[0]])],
    () => (S.source.kind === "scene" ? S.source.key : ""), (k) => { S.source = { kind: "scene", key: k }; $("dropText").innerHTML = "<b>Drop, paste, or choose an image.</b> It stays in this browser."; });
  seg("algos", Object.entries(ALGOS).map(([k, a]) => [k, a.label]), () => S.algo, (k) => (S.algo = k));
  seg("fields", [["flat", "Flat"], ["wave", "Guilloché"], ["relief", "Relief"]], () => S.field, (k) => (S.field = k));
  seg("kernels", [["atkinson", "Atkinson"], ["fs", "Floyd–Steinberg"]], () => S.kernel, (k) => (S.kernel = k));
  seg("polarity", [["false", "Ink the shadows"], ["true", "Ink the light"]], () => S.inkLight, (k) => (S.inkLight = k === "true"));
  seg("views", [["plate", "Plate"], ["tone", "Ink map"], ["source", "Source"]], () => S.view, (k) => (S.view = k));
  segs.push("scenes", "algos", "fields", "kernels", "polarity", "views");

  range("anchor", () => S.anchor, (v) => (S.anchor = v), pct);
  range("angle", () => S.angle, (v) => (S.angle = v), (v) => `${v}°`);
  range("lift", () => S.lift, (v) => (S.lift = v), pct);
  range("fade", () => S.fade, (v) => (S.fade = v), pct);
  range("contrast", () => S.contrast, (v) => (S.contrast = v), (v) => v.toFixed(2));
  range("gamma", () => S.gamma, (v) => (S.gamma = v), (v) => v.toFixed(2));
  range("plateH", () => S.plateH, (v) => { S.plateH = v; paintSite(); }, (v) => `${v} px`);
  range("overlap", () => S.overlap, (v) => { S.overlap = v; paintSite(); }, pct);
  ranges.push("anchor", "angle", "lift", "fade", "contrast", "gamma", "plateH", "overlap");

  $("size").addEventListener("input", (e) => { S.sizes[S.algo] = +e.target.value; $("sizeOut").textContent = `${S.sizes[S.algo]} px`; schedule(); });
  $("hatch").addEventListener("change", (e) => { S.hatch = e.target.checked; schedule(); });
  const themeSel = $("theme");
  for (const [k, th] of Object.entries(THEMES)) themeSel.add(new Option(th.label, k));
  themeSel.addEventListener("change", () => { applyTheme(themeSel.value); sync(); schedule(); });
  $("bg").addEventListener("input", (e) => { S.bg = e.target.value; paintSite(); });
  $("ink").addEventListener("input", (e) => { S.ink = e.target.value; paintSite(); if (S.view === "tone") schedule(); });
  $("ink").addEventListener("change", () => schedule()); // palette in the PNG follows the ink
  $("bits").addEventListener("change", (e) => { S.bits = e.target.value; schedule(); });
  $("exportW").addEventListener("change", (e) => { S.exportW = +e.target.value; updateSnippet(); });
  $("download").addEventListener("click", exportPNG);
  $("copy").addEventListener("click", copyCSS);

  // Image input: file picker, drag and drop anywhere on the bench, paste.
  const load = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      S.source = { kind: "file", name: `${file.name}:${file.size}:${file.lastModified}`, img };
      $("dropText").innerHTML = `<b>${file.name.replace(/[<&>]/g, "")}</b> · ${img.naturalWidth}×${img.naturalHeight}. Choose a scene to switch back.`;
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
    if (item) load(item.getAsFile());
  });

  // Width or height changes re-render at the new device-pixel size.
  new ResizeObserver(() => schedule()).observe(plate);
}

applyTheme(S.theme);
initControls();
sync();
$("readout").textContent = "Rendering the sample scene…";
setTimeout(schedule, 30);
