import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  isoProject2D,
  isoFaceMatrix2D,
  isoToWorld3D,
  computeOrthoHeight,
  computeZoomWeightFade,
  createCameraBasis,
  projectPoint,
  buildRoundedBoxMesh,
  buildCylinderMesh,
  extractCreaseGraph,
  selectCreaseEdges,
  extractSilhouetteEdges,
  createGBuffer,
  rasterizeSceneToGBuffer,
  runSobelOutlinePass,
  evalPointGlow,
  hashDither2D,
  advanceTransportState,
  buildCassetteDeckScene,
  TAPE_MAX,
} from './mechanics.mjs';

test('2D SVG kernel and 3D camera projection preserve isometric symmetry and frustum equivalence', () => {
  // Equal step in +x and +y moves strictly vertically in 2D isometric projection
  const [x0, y0] = isoProject2D(10, 10, 0);
  const [x1, y1] = isoProject2D(20, 20, 0);
  assert.ok(Math.abs(x0) < 1e-9 && Math.abs(x1) < 1e-9);
  assert.ok(y1 > y0);

  // Face matrix generates valid SVG matrix(...) transform
  const topMat = isoFaceMatrix2D('TOP', 20, 30, 55);
  assert.match(topMat, /^matrix\(/);

  // Perspective and Orthographic cameras at target depth have identical projected scale
  const target = isoToWorld3D(160, 120, 40);
  const perspCam = createCameraBasis({ target, distance: 6.5, fovDeg: 28, orthoMix: 0, width: 800, height: 600 });
  const orthoCam = createCameraBasis({ target, distance: 6.5, fovDeg: 28, orthoMix: 1, width: 800, height: 600 });
  assert.ok(Math.abs(perspCam.orthoH - computeOrthoHeight(6.5, 28, 1)) < 1e-9);

  // A point offset in the target plane projects to the exact same screen pixel in orthoMix=0 and orthoMix=1
  const testPt = [
    target[0] + perspCam.right[0] * 0.5,
    target[1] + perspCam.right[1] * 0.5,
    target[2] + perspCam.right[2] * 0.5,
  ];
  const [sxP, syP] = projectPoint(testPt, perspCam);
  const [sxO, syO] = projectPoint(testPt, orthoCam);
  assert.ok(Math.abs(sxP - sxO) < 1e-5, `Expected sxP (${sxP}) == sxO (${sxO})`);
  assert.ok(Math.abs(syP - syO) < 1e-5, `Expected syP (${syP}) == syO (${syO})`);

  // Zoom weight fade clamps between fadeMin and 1.0
  assert.equal(computeZoomWeightFade(5, 0.45), 0.45);
  assert.equal(computeZoomWeightFade(60, 0.45), 1.0);
});

test('Hysteresis crease extraction rescues gentle continuation folds and union-find prunes micro-fragments', () => {
  // Construct a 3-segment crease chain where segment 0 is 34 deg (above 30 deg threshold),
  // segment 1 is 22 deg (below 30 deg, but >= 0.55 * 30 = 16.5 deg and colinear),
  // plus a tiny isolated 35 deg fragment of length 0.02m (< 0.06m minLength).
  const degToNormal = deg => [0, Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  const mockGraph = {
    weldedVerts: [
      [0, 0, 0],
      [0.1, 0, 0],
      [0.2, 0, 0],
      [0.5, 0, 0],
      [0.52, 0, 0],
    ],
    edges: [
      { index: 0, a: 0, b: 1, va: [0, 0, 0], vb: [0.1, 0, 0], ang: 34, len: 0.1, dir: [1, 0, 0], faces: [0, 1], normals: [[0, 1, 0], degToNormal(34)] },
      { index: 1, a: 1, b: 2, va: [0.1, 0, 0], vb: [0.2, 0, 0], ang: 22, len: 0.1, dir: [1, 0, 0], faces: [2, 3], normals: [[0, 1, 0], degToNormal(22)] },
      { index: 2, a: 3, b: 4, va: [0.5, 0, 0], vb: [0.52, 0, 0], ang: 38, len: 0.02, dir: [1, 0, 0], faces: [4, 5], normals: [[0, 1, 0], degToNormal(38)] },
    ],
    byVert: new Map([
      [0, [0]],
      [1, [0, 1]],
      [2, [1]],
      [3, [2]],
      [4, [2]],
    ]),
  };

  // Naive EdgesGeometry (hysteresis: false): misses edge 1 (22 deg < 30 deg) and keeps tiny fragment edge 2 (0.02m)
  const naive = selectCreaseEdges(mockGraph, { thresholdDeg: 30, hysteresis: false });
  assert.equal(naive.minor.length, 2); // edges 0 and 2
  assert.equal(naive.grown.length, 0);
  assert.equal(naive.pruned.length, 0);

  // Iso-Glow Hysteresis + Union-Find Pruning (hysteresis: true, minLength: 0.06):
  // Rescues edge 1 via hysteresis (grown: 1) and prunes tiny isolated edge 2 (pruned: 1)
  const smart = selectCreaseEdges(mockGraph, { thresholdDeg: 30, hysteresis: true, growFactor: 0.55, straightCos: 0.9, minLength: 0.06 });
  assert.equal(smart.minor.length, 2); // edges 0 and 1
  assert.equal(smart.grown.length, 1);
  assert.equal(smart.grown[0].index, 1);
  assert.equal(smart.pruned.length, 1);
  assert.equal(smart.pruned[0].index, 2);
});

test('Smooth cylinder exposes curved silhouette via backface/frontface adjacency without internal facet clutter', () => {
  const cyl = buildCylinderMesh({ cx: 100, cy: 100, z: 10, r: 20, h: 30, segments: 24, partId: 8 });
  const graph = extractCreaseGraph(cyl);
  // At 30 deg threshold, 24-gon side facets have 360/24 = 15 deg dihedral angle, so internal facets are NOT drawn as creases
  const creases = selectCreaseEdges(graph, { thresholdDeg: 30, hysteresis: true });
  // Only top and bottom 90 deg rims are creases (24 + 24 = 48 edges)
  assert.equal(creases.major.length, 48);
  assert.equal(creases.minor.length, 0);

  // Meanwhile, silhouette extractor finds the 2 vertical side contour generators + rim horizon arcs
  const cam = createCameraBasis({ target: isoToWorld3D(100, 100, 25), distance: 5, orthoMix: 1 });
  const sil = extractSilhouetteEdges(graph, cam);
  assert.ok(sil.length > 10, 'Expected silhouette contour edges on smooth cylinder');
});

test('G-Buffer Sobel view-normal modulation suppresses grazing-angle false depth ink on flat deck', () => {
  const plate = buildRoundedBoxMesh({ x: 0, y: 0, z: 0, w: 320, d: 240, h: 7, r: 14, partId: 1 });
  // Shallow grazing camera (elevation = 11 deg) looking across the large flat top plate
  const cam = createCameraBasis({
    target: isoToWorld3D(160, 120, 3.5),
    azimuthDeg: 45,
    elevationDeg: 11,
    distance: 5.2,
    orthoMix: 1,
    width: 160,
    height: 120,
  });
  const gbuf = createGBuffer(160, 120);
  rasterizeSceneToGBuffer([plate], cam, gbuf);

  const unmodulated = runSobelOutlinePass(gbuf, {
    baseDepthThreshold: 0.032,
    grazingModulation: false,
    grazingK: 5.0,
    useObjectId: true,
  });
  const modulated = runSobelOutlinePass(gbuf, {
    baseDepthThreshold: 0.032,
    grazingModulation: true,
    grazingK: 5.0,
    useObjectId: true,
  });

  // Unmodulated Sobel produces false grazing depth artifacts across the interior of the tilted plate
  assert.ok(unmodulated.falseGrazingCount > 100, `Expected grazing artifacts when modulation is off, got ${unmodulated.falseGrazingCount}`);
  assert.equal(modulated.falseGrazingCount, 0);
  assert.ok(modulated.totalEdgePixels < unmodulated.totalEdgePixels);
});

test('G-Buffer Object-ID channel recovers flush coplanar seams invisible to Depth+Normal Sobel', () => {
  // Build cassette deck with flush coplanar transport keys
  const meshes = buildCassetteDeckScene({
    keyStates: {
      rew: { flushCoplanar: true },
      play: { flushCoplanar: true, lit: true },
      ff: { flushCoplanar: true },
      stop: { flushCoplanar: true },
      rec: { flushCoplanar: true },
    },
  });
  const cam = createCameraBasis({
    target: isoToWorld3D(160, 120, 40),
    azimuthDeg: 45,
    elevationDeg: 35.264,
    distance: 6.4,
    orthoMix: 1,
    width: 180,
    height: 135,
  });
  const gbuf = createGBuffer(180, 135);
  rasterizeSceneToGBuffer(meshes, cam, gbuf);

  const withoutId = runSobelOutlinePass(gbuf, { useObjectId: false, grazingModulation: true });
  const withId = runSobelOutlinePass(gbuf, { useObjectId: true, grazingModulation: true });

  assert.equal(withoutId.objectIdEdgeCount, 0);
  assert.ok(withId.objectIdEdgeCount > 80, `Expected >80 coplanar seam pixels recovered by Object-ID, got ${withId.objectIdEdgeCount}`);
});

test('Tape transport physics and analytic glow + hash dither behave within bounds', () => {
  let st = { mode: 'play', count: 0, ang: 0 };
  st = advanceTransportState(st, 10);
  assert.ok(st.count > 0 && st.count < TAPE_MAX);
  assert.ok(st.rSupply > st.rTakeup, 'Early in tape, supply pack radius is larger than take-up');
  assert.ok(st.supplyAngle < st.takeupAngle, 'Early in tape, smaller take-up pack spins faster than supply pack');

  // Auto-stop at tape end during FF
  const endSt = advanceTransportState({ mode: 'ff', count: TAPE_MAX - 5, ang: 1 }, 2);
  assert.equal(endSt.count, TAPE_MAX);
  assert.equal(endSt.mode, 'stop');

  // Analytic glow & hash dither
  const d = hashDither2D(42, 99);
  assert.ok(Math.abs(d) <= 0.5 / 255.0 + 1e-9);
  const gCenter = evalPointGlow(0.0, 1.0, d);
  const gEdge = evalPointGlow(0.95, 1.0, d);
  const gOut = evalPointGlow(1.1, 1.0, d);
  assert.ok(gCenter.alpha > gEdge.alpha);
  assert.equal(gOut.alpha, 0);
});

test('Self-contained dist/iso-glow.html and root index.html execute all UI states without errors', () => {
  const html = readFileSync(new URL('./dist/iso-glow.html', import.meta.url), 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'dist/iso-glow.html must contain inline script');

  const elements = new Map();
  let rafCallback = null;
  const ctx2d = {
    save() {}, restore() {}, setTransform() {}, scale() {}, translate() {},
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, arc() {}, rect() {}, clip() {},
    fill() {}, stroke() {}, fillRect() {}, strokeRect() {}, fillText() {},
    setLineDash() {}, drawImage() {},
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData() {},
    createRadialGradient: () => ({ addColorStop() {} }),
  };

  function makeEl(id = '', dataset = {}) {
    const listeners = new Map();
    const el = {
      id,
      dataset: { ...dataset },
      value: id === 'rng-edge-angle' ? '30' : id === 'rng-grazing-k' ? '4.5' : id === 'rng-section' ? '100' : id === 'rng-kernel-r' ? '8' : '0',
      checked: id !== 'chk-flush-keys',
      hidden: false,
      innerHTML: '',
      textContent: '',
      style: { setProperty() {} },
      classList: { toggle() {}, add() {}, remove() {} },
      setAttribute() {},
      getAttribute: () => 'true',
      appendChild() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 300 }),
      getContext: () => ctx2d,
      setPointerCapture() {},
      addEventListener(type, fn) { listeners.set(type, fn); },
      click() { const fn = listeners.get('click'); if (fn) fn({ preventDefault() {} }); },
      trigger(type, ev = {}) { const fn = listeners.get(type); if (fn) fn({ preventDefault() {}, target: el, ...ev }); },
    };
    return el;
  }

  const pipelineBtns = ['isoglow', 'naive', 'sobel', 'split'].map(p => makeEl('', { pipeline: p }));
  const viewBtns = ['composite', 'xray', 'gbuffer'].map(v => makeEl('', { view: v }));
  const presetBtns = ['default', 'grazing', 'coplanar', 'cutaway'].map(p => makeEl('', { preset: p }));
  const tkeyBtns = ['rew', 'play', 'ff', 'stop', 'rec'].map(k => makeEl('', { tkey: k }));
  const tabBtns = ['workbench', 'kernel', 'study'].map(t => makeEl(`tab-btn-${t}`, { tab: t }));

  const document = {
    documentElement: makeEl('html'),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeEl(id));
      return elements.get(id);
    },
    createElement: tag => makeEl(tag),
    querySelectorAll(sel) {
      if (sel === '[data-tab]') return tabBtns;
      if (sel === '[data-pipeline]') return pipelineBtns;
      if (sel === '[data-view]') return viewBtns;
      if (sel === '[data-preset]') return presetBtns;
      if (sel === '[data-tkey]') return tkeyBtns;
      if (sel === '.swatch') return [];
      return [];
    },
    querySelector() { return viewBtns[0]; },
  };

  const windowObj = {
    devicePixelRatio: 1,
    addEventListener() {},
  };

  const vmCtx = vm.createContext({
    document,
    window: windowObj,
    performance: { now: () => 1000 },
    requestAnimationFrame: fn => { rafCallback = fn; return 1; },
    Uint8ClampedArray, Float32Array, Uint16Array, Uint8Array, Int32Array,
    Math, Number, String, Array, Object, Set, Map,
  });

  vm.runInContext(scriptMatch[1], vmCtx);
  assert.ok(typeof rafCallback === 'function', 'requestAnimationFrame loop must be registered');

  // Exercise pipelines, views, presets, and theme toggles across frames
  let t = 1016;
  for (const pBtn of pipelineBtns) {
    pBtn.click();
    for (const vBtn of viewBtns) {
      vBtn.click();
      rafCallback(t += 16);
      const creasesText = document.getElementById('metric-creases').textContent;
      const sobelText = document.getElementById('metric-sobel').textContent;
      assert.doesNotMatch(creasesText, /NaN|undefined/);
      assert.doesNotMatch(sobelText, /NaN|undefined/);
    }
  }
  for (const presetBtn of presetBtns) {
    presetBtn.click();
    rafCallback(t += 16);
  }
  document.getElementById('btn-theme').click();
  document.getElementById('btn-ortho').click();
  rafCallback(t += 16);
  assert.match(document.getElementById('svg-kernel-holder').innerHTML, /<svg/);

  // Also verify root index.html inline script executes cleanly
  const rootHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const rootScript = rootHtml.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(rootScript, 'root index.html must contain theme script');
  const themeSelect = makeEl('theme');
  const rootDoc = {
    documentElement: { dataset: {} },
    getElementById: () => themeSelect,
  };
  vm.runInContext(rootScript[1], vm.createContext({ document: rootDoc }));
  themeSelect.trigger('change', { target: { value: 'dark' } });
  assert.equal(rootDoc.documentElement.dataset.theme, 'dark');
});

