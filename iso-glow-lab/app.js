import {
  DEG2RAD,
  TAPE_MAX,
  PALETTES,
  THEMES,
  isoProject2D,
  isoFaceMatrix2D,
  isoToWorld3D,
  computeZoomWeightFade,
  createCameraBasis,
  normalToView,
  projectPoint,
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
} from './mechanics.mjs';

(() => {
  const $ = id => document.getElementById(id);

  // ── Application State ──
  const state = {
    tab: 'workbench',
    theme: 'dark',
    accentKey: 'ember',
    pipeline: 'isoglow', // 'isoglow' | 'naive' | 'sobel' | 'split'
    viewMode: 'composite', // 'composite' | 'xray' | 'gbuffer'
    splitRatio: 0.5,

    // Camera state
    azimuthDeg: 45,
    elevationDeg: 35.264389682754654,
    targetAzimuthDeg: 45,
    targetElevationDeg: 35.264389682754654,
    distance: 6.2,
    orthoMix: 1, // 1 = Ortho Iso, 0 = 28° Perspective
    targetOrthoMix: 1,
    zoom: 1.0,
    targetZoom: 1.0,

    // Pipeline parameters
    edgeAngle: 30,
    hysteresis: true,
    hullOutline: true,
    grazingModulation: true,
    grazingK: 4.5,
    useObjectId: true,
    flushCoplanarKeys: false,
    explode: 0,
    sectionPct: 100,
    glowMode: 'analytic', // 'analytic' | 'bloom' | 'nodither'
    kernelRadius: 8,

    // C-07 Cassette Transport State
    transport: {
      mode: 'stop', // 'stop' | 'play' | 'ff' | 'rew'
      rec: false,
      count: 160,
      ang: 0.4,
      fraction: 160 / TAPE_MAX,
      rSupply: 15.75,
      rTakeup: 9.25,
      supplyAngle: 0.4,
      takeupAngle: 0.4,
      vu: [0, 0],
      holdKey: null,
      holdStart: 0,
    },
    pressedKey: null,
    pressTimer: null,
    hoveredPartName: null,
    muted: false,
  };

  // ── Procedural Web Audio Engine (Lo-Fi Loop + Switch Foley, started on user gesture) ──
  let audioCtx = null;
  let masterOut = null;
  let synthLoop = null;

  function ensureAudio() {
    if (state.muted) return null;
    try {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
        masterOut = audioCtx.createGain();
        masterOut.gain.value = 0.75;
        masterOut.connect(audioCtx.destination);
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return { ctx: audioCtx, out: masterOut };
    } catch {
      return null;
    }
  }

  function playMechanicalClick(freq = 1100, dur = 0.028) {
    const a = ensureAudio();
    if (!a) return;
    try {
      const { ctx, out } = a;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + dur);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    } catch {}
  }

  const CHORDS = [
    [57, 60, 64, 67],
    [53, 57, 60, 64],
    [48, 52, 55, 59],
    [55, 59, 62, 65],
  ];
  const ARP = [0, 1, 2, 3, 2, 1, 3, 2];
  const EIGHTH = 60 / 76 / 2;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function scheduleLoFiStep(loop, step, t) {
    const { ctx, filt, noise } = loop;
    const bar = Math.floor(step / 8) % 4;
    const e = step % 8;
    const ch = CHORDS[bar];

    const voice = (type, f, startT, dur, peak, panVal = 0, att = 0.01) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      o.type = type;
      o.frequency.setValueAtTime(f, startT);
      o.detune.value = (Math.random() - 0.5) * 12;
      g.gain.setValueAtTime(0.0001, startT);
      g.gain.linearRampToValueAtTime(peak, startT + att);
      g.gain.exponentialRampToValueAtTime(0.0008, startT + dur);
      if (p) {
        p.pan.value = panVal;
        o.connect(g);
        g.connect(p);
        p.connect(filt);
      } else {
        o.connect(g);
        g.connect(filt);
      }
      o.start(startT);
      o.stop(startT + dur + 0.04);
      loop.nodes.add(o);
      o.onended = () => loop.nodes.delete(o);
      return o;
    };

    if (e === 0) {
      ch.forEach((m, i) => voice('triangle', mtof(m), t, EIGHTH * 8.0, 0.04, (i - 1.5) * 0.28, 0.2));
      voice('sine', mtof(ch[0] - 24), t, EIGHTH * 3.4, 0.20, 0, 0.02);
    }
    if (e === 4) {
      voice('sine', mtof(ch[0] - 24), t, EIGHTH * 2.8, 0.15, 0, 0.02);
    }
    const sw = e % 2 ? EIGHTH * 0.15 : 0;
    voice('square', mtof(ch[ARP[e]] + 12), t + sw, EIGHTH * 0.85, 0.02, e % 2 ? 0.5 : -0.5);
    if (e === 0 || e === 4) {
      const kick = voice('sine', 112, t, 0.3, 0.42, 0, 0.004);
      kick.frequency.exponentialRampToValueAtTime(42, t + 0.17);
    }
    if (e % 2 && noise) {
      const n = ctx.createBufferSource();
      const g = ctx.createGain();
      n.buffer = noise;
      g.gain.setValueAtTime(0.045, t + sw);
      g.gain.exponentialRampToValueAtTime(0.001, t + sw + 0.05);
      n.connect(g);
      g.connect(filt);
      n.start(t + sw);
      n.stop(t + sw + 0.06);
      loop.nodes.add(n);
      n.onended = () => loop.nodes.delete(n);
    }
  }

  function startSynthAudio() {
    if (synthLoop || state.muted) return;
    const a = ensureAudio();
    if (!a) return;
    try {
      const { ctx, out } = a;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.0001, ctx.currentTime);
      bus.gain.setTargetAtTime(0.85, ctx.currentTime, 0.04);

      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 1500;
      filt.Q.value = 0.85;

      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.18;
      lfoG.gain.value = 480;
      lfo.connect(lfoG);
      lfoG.connect(filt.frequency);
      lfo.start();

      filt.connect(bus);
      bus.connect(out);

      const noise = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.1)), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

      const loop = {
        ctx,
        bus,
        filt,
        lfo,
        noise,
        nodes: new Set(),
        step: 0,
        next: ctx.currentTime + 0.05,
        timer: null,
      };
      const tick = () => {
        while (loop.next < ctx.currentTime + 0.28) {
          scheduleLoFiStep(loop, loop.step++, loop.next);
          loop.next += EIGHTH;
        }
      };
      tick();
      loop.timer = setInterval(tick, 60);
      synthLoop = loop;
    } catch {
      synthLoop = null;
    }
  }

  function stopSynthAudio() {
    if (!synthLoop) return;
    const loop = synthLoop;
    synthLoop = null;
    clearInterval(loop.timer);
    try {
      loop.bus.gain.setTargetAtTime(0.0001, loop.ctx.currentTime, 0.025);
    } catch {}
    setTimeout(() => {
      loop.nodes.forEach(n => {
        try { n.stop(); } catch {}
      });
      loop.nodes.clear();
      try { loop.lfo.stop(); } catch {}
      try { loop.bus.disconnect(); } catch {}
    }, 140);
  }

  // ── Cached Scene & Crease Graph Management ──
  let cachedSceneKey = '';
  let sceneMeshes = [];
  let meshGraphs = [];
  const gbuf = createGBuffer(300, 188);
  const offscreenSobelCanvas = document.createElement('canvas');
  offscreenSobelCanvas.width = gbuf.width;
  offscreenSobelCanvas.height = gbuf.height;
  const offscreenSobelCtx = offscreenSobelCanvas.getContext('2d');

  const offscreenGbufCanvas = document.createElement('canvas');
  offscreenGbufCanvas.width = gbuf.width;
  offscreenGbufCanvas.height = gbuf.height;
  const offscreenGbufCtx = offscreenGbufCanvas.getContext('2d');

  function getSceneData() {
    const m = state.transport.mode;
    const tapeBucket = Math.round(state.transport.fraction * 24) / 24;
    const key = [
      state.explode.toFixed(2),
      state.flushCoplanarKeys ? 1 : 0,
      tapeBucket.toFixed(3),
      m,
      state.transport.rec ? 1 : 0,
      state.pressedKey || '',
    ].join('|');

    if (key !== cachedSceneKey) {
      cachedSceneKey = key;
      const keyStates = {
        rew:  { lit: m === 'rew',  pressed: state.pressedKey === 'rew' || m === 'rew',  flushCoplanar: state.flushCoplanarKeys },
        play: { lit: m === 'play', pressed: state.pressedKey === 'play' || m === 'play', flushCoplanar: state.flushCoplanarKeys },
        ff:   { lit: m === 'ff',   pressed: state.pressedKey === 'ff' || m === 'ff',   flushCoplanar: state.flushCoplanarKeys },
        stop: { lit: false,        pressed: state.pressedKey === 'stop',                flushCoplanar: state.flushCoplanarKeys },
        rec:  { lit: state.transport.rec, pressed: state.pressedKey === 'rec' || state.transport.rec, flushCoplanar: state.flushCoplanarKeys },
      };
      sceneMeshes = buildCassetteDeckScene({
        filletSegments: 6,
        cylSegments: 24,
        explode: state.explode,
        keyStates,
        tapeFraction: tapeBucket,
      });
      meshGraphs = sceneMeshes.map(mesh => extractCreaseGraph(mesh));
    }
    return { sceneMeshes, meshGraphs };
  }

  // ── Transport Actions ──
  function setTransportMode(nextMode) {
    if (nextMode === state.transport.mode) return;
    state.transport.mode = nextMode;
    if (nextMode === 'play') startSynthAudio();
    else stopSynthAudio();
  }

  function triggerTransportKey(k) {
    playMechanicalClick(k === 'stop' ? 880 : 1240);
    state.pressedKey = k;
    clearTimeout(state.pressTimer);
    state.pressTimer = setTimeout(() => {
      state.pressedKey = null;
    }, 150);

    if (k === 'play') {
      setTransportMode(state.transport.mode === 'play' ? 'stop' : 'play');
    } else if (k === 'ff' || k === 'rew') {
      setTransportMode(state.transport.mode === k ? 'stop' : k);
    } else if (k === 'stop') {
      setTransportMode('stop');
    } else if (k === 'rec') {
      state.transport.rec = !state.transport.rec;
    }
    syncTransportUI();
  }

  function syncTransportUI() {
    const m = state.transport.mode;
    document.querySelectorAll('.tkey-btn[data-tkey]').forEach(btn => {
      const k = btn.dataset.tkey;
      const isLit = (k === 'play' && m === 'play') ||
                    (k === 'ff' && m === 'ff') ||
                    (k === 'rew' && m === 'rew') ||
                    (k === 'rec' && state.transport.rec);
      btn.classList.toggle('lit', isLit);
    });
  }

  // ── Surface Inscriptions in 3D World Space (Cassette Reels, Counter, VU Meters, Vents, Labels) ──
  function draw3DSurfaceDetails(ctx, cam, pal, themeObj, sectionX, liftOffset) {
    const TS = 0.01;
    const PLZ = 7, DX = 20, DY = 30, DZ = 11, DW = 280, DD = 170, DH = 44, DT = DZ + DH, DF = DY + DD;
    const SX = 24, SY = 17;
    const deckLift = state.explode * 1.6 * 0.28;
    const casLift = state.explode * 2.5 * 0.28;
    const reelLift = state.explode * 2.9 * 0.28;
    const keyLift = state.explode * 2.2 * 0.28;

    const p3 = (ix, iy, iz, extraY = 0) => {
      const w = isoToWorld3D(ix, iy, iz, TS);
      w[1] += extraY;
      if (w[0] > sectionX) return null;
      return projectPoint(w, cam);
    };

    const poly3 = (pts, stroke, fill = null, lineWidth = 1) => {
      const proj = [];
      for (const pt of pts) {
        const p = p3(pt[0], pt[1], pt[2], pt[3] || 0);
        if (!p) return;
        proj.push(p);
      }
      ctx.beginPath();
      proj.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
      if (fill) {
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const detailRgb = `rgb(${themeObj.edge.join(',')})`;
    const majorRgb = `rgb(${themeObj.major.join(',')})`;
    const lineRgb = `rgb(${themeObj.line.join(',')})`;

    // 1. Base plate corner screw slots
    for (const [sx, sy] of [[18, 18], [302, 18], [18, 222], [302, 222]]) {
      poly3([[sx - 2.2, sy, PLZ + 0.15, 0], [sx + 2.2, sy, PLZ + 0.15, 0]], majorRgb, null, 1.2);
    }

    // 2. Front panel ventilation slits & REC indicator
    for (let x = 120; x <= 196; x += 4.5) {
      poly3([[DX + x, DF + 0.15, DT - 10, deckLift], [DX + x, DF + 0.15, DT - 34, deckLift]], detailRgb, null, 1);
    }

    // 3. Cassette window, tape packs, and spinning 6-spoke reel hubs
    const r1 = state.transport.rSupply;
    const r2 = state.transport.rTakeup;
    const running = state.transport.mode !== 'stop';
    const spokeColor = running ? pal.hex : lineRgb;
    const reels = [
      [DX + SX + 44, DY + SY + 41, r1, state.transport.supplyAngle],
      [DX + SX + 96, DY + SY + 41, r2, state.transport.takeupAngle],
    ];
    for (const [cx, cy, rPack, a0] of reels) {
      // Hub ring & 6 spokes on top of the reel cylinder
      const zTop = DT + 7.3;
      const hubPts = [];
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        hubPts.push([cx + Math.cos(a) * 6.5, cy + Math.sin(a) * 6.5, zTop, reelLift]);
      }
      poly3(hubPts, spokeColor, `rgb(${themeObj.recess.join(',')})`, 1.2);

      for (let s = 0; s < 6; s++) {
        const a = a0 + (s * Math.PI) / 3;
        poly3([
          [cx + Math.cos(a) * 2.4, cy + Math.sin(a) * 2.4, zTop + 0.1, reelLift],
          [cx + Math.cos(a) * 6.2, cy + Math.sin(a) * 6.2, zTop + 0.1, reelLift],
        ], spokeColor, null, 1.35);
      }
    }

    // Cassette label strip on shell
    const lblPt = p3(DX + SX + 26, DY + SY + 15, DT + 4.2, casLift);
    if (lblPt) {
      ctx.save();
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = themeObj.inkHi;
      ctx.fillText('MIX 01 · C-60', lblPt[0] - 28, lblPt[1]);
      ctx.restore();
    }

    // 4. Counter & 12-Segment Stereo VU Meter Bezel
    const vuActive = running || state.transport.rec;
    const vuCornerPts = [
      [DX + 191, DY + 15, DT + 0.3, deckLift],
      [DX + 263, DY + 15, DT + 0.3, deckLift],
      [DX + 263, DY + 109, DT + 0.3, deckLift],
      [DX + 191, DY + 109, DT + 0.3, deckLift],
    ];
    poly3([...vuCornerPts, vuCornerPts[0]], vuActive ? pal.hex : majorRgb, vuActive ? themeObj.glassOn : themeObj.glassOff, 1.2);

    // 3-digit counter text
    const cntStr = String(Math.floor(state.transport.count) % 1000).padStart(3, '0');
    const cntPos = p3(DX + 227, DY + 36, DT + 0.5, deckLift);
    if (cntPos) {
      ctx.save();
      ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = vuActive ? pal.hex : themeObj.ink;
      ctx.textAlign = 'center';
      ctx.fillText(cntStr, cntPos[0], cntPos[1]);
      ctx.restore();
    }

    // 12-segment L/R VU bars in 3D isometric top plane
    const litL = Math.round(Math.min(1, state.transport.vu[0]) * 12);
    const litR = Math.round(Math.min(1, state.transport.vu[1]) * 12);
    [
      [DY + 64, litL],
      [DY + 80, litR],
    ].forEach(([rowY, litCount]) => {
      for (let i = 0; i < 12; i++) {
        const bx = DX + 198 + i * 5.1;
        const isLit = i < litCount;
        const segColor = isLit ? (i >= 10 ? (state.theme === 'light' ? pal.lightHi : pal.hi) : pal.hex) : detailRgb;
        poly3([
          [bx, rowY, DT + 0.4, deckLift],
          [bx + 3.6, rowY, DT + 0.4, deckLift],
          [bx + 3.6, rowY + 8, DT + 0.4, deckLift],
          [bx, rowY + 8, DT + 0.4, deckLift],
        ], null, segColor);
      }
    });

    // 5. Transport Key Legends (REW, PLAY, FF, STOP, REC)
    const KEYS = [
      ['rew', '◀◀'],
      ['play', '▶'],
      ['ff', '▶▶'],
      ['stop', '■'],
      ['rec', '●'],
    ];
    const KW = 46.4, KST = 49.6, KD = 32;
    const kh = state.flushCoplanarKeys ? 0.15 : 6;
    KEYS.forEach(([k, sym], i) => {
      const kx = DX + 16 + i * KST + KW * 0.5;
      const ky = DY + 126 + KD * 0.55;
      const isLit = (k === 'play' && state.transport.mode === 'play') ||
                    (k === 'ff' && state.transport.mode === 'ff') ||
                    (k === 'rew' && state.transport.mode === 'rew') ||
                    (k === 'rec' && state.transport.rec);
      const pt = p3(kx, ky, DT + kh + 0.3, keyLift);
      if (pt) {
        ctx.save();
        ctx.font = '600 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = isLit ? (state.theme === 'light' ? '#ffffff' : '#121314') : themeObj.inkHi;
        ctx.textAlign = 'center';
        ctx.fillText(sym, pt[0], pt[1]);
        ctx.restore();
      }
    });
  }

  // ── Main 3D & Pipeline Renderer ──
  const canvas = $('stage-canvas');
  const ctx = canvas.getContext('2d');
  let hitPolygons = [];

  function renderShadedAndObjectPass(targetCtx, cam, mode, xray, sectionX, pal, themeObj) {
    const { sceneMeshes: meshes, meshGraphs: graphs } = getSceneData();
    const isLight = state.theme === 'light';
    const fade = computeZoomWeightFade(cam.ppm, themeObj.fadeMin);

    const lerpRgb = (a, b, t) => [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];

    const silCol = `rgb(${lerpRgb(themeObj.bg, themeObj.line, fade).join(',')})`;
    const majCol = `rgb(${lerpRgb(themeObj.bg, themeObj.major, fade).join(',')})`;
    const minCol = `rgb(${lerpRgb(themeObj.bg, themeObj.edge, fade).join(',')})`;

    // 1. Collect and depth-sort visible triangles across all meshes
    const drawTris = [];
    hitPolygons = [];

    const sunDir = [0.38, 0.82, 0.42];
    const fillDir = [-0.62, 0.25, -0.55];

    for (let mi = 0; mi < meshes.length; mi++) {
      const mesh = meshes[mi];
      const off = mesh.worldOffset || [0, 0, 0];
      const pVerts = mesh.vertices.map(v => {
        const wx = v[0] + off[0];
        const wy = v[1] + off[1];
        const wz = v[2] + off[2];
        return { wx, wy, wz, proj: projectPoint([wx, wy, wz], cam) };
      });

      for (let f = 0; f < mesh.faces.length; f++) {
        const [ia, ib, ic] = mesh.faces[f];
        const va = pVerts[ia], vb = pVerts[ib], vc = pVerts[ic];
        const clippedCount = (va.wx > sectionX ? 1 : 0) + (vb.wx > sectionX ? 1 : 0) + (vc.wx > sectionX ? 1 : 0);
        if (clippedCount === 3) continue;

        const fn = mesh.faceNormals[f];
        const vn = normalToView(fn, cam);
        if (vn[2] < -0.08 && clippedCount === 0) continue;

        const depth = (va.proj[2] + vb.proj[2] + vc.proj[2]) / 3 + (mesh.depthBias || 0);
        drawTris.push({
          mesh,
          va,
          vb,
          vc,
          fn,
          depth,
          isSectionCut: clippedCount > 0,
        });
      }
    }

    // Painter's sort back-to-front
    drawTris.sort((a, b) => b.depth - a.depth);

    // 2. Soft Deck Shadow & Analytic Light Pool (in Composite mode)
    if (!xray) {
      const center2D = projectPoint([1.6, 0, 1.2], cam);
      const rx = cam.ppm * 1.95;
      const ry = cam.ppm * 1.15;

      // Contact shadow under plate
      targetCtx.save();
      targetCtx.translate(center2D[0], center2D[1] + 8);
      targetCtx.scale(1, ry / Math.max(1, rx));
      const shGrad = targetCtx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
      shGrad.addColorStop(0, `rgba(0,0,0,${themeObj.shadowOpacity})`);
      shGrad.addColorStop(1, 'rgba(0,0,0,0)');
      targetCtx.fillStyle = shGrad;
      targetCtx.beginPath();
      targetCtx.arc(0, 0, rx, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.restore();

      // In Dark theme (isoglow.dev rule: light theme disables additive glow pools!), draw ambient accent pool when active
      const activeGlow = state.transport.mode !== 'stop' || state.transport.rec;
      if (!isLight && activeGlow) {
        if (state.glowMode === 'nodither') {
          // Demonstrate visible 8-bit concentric Mach banding when hash dither is disabled
          for (let ring = 7; ring >= 1; ring--) {
            const frac = ring / 7;
            const alpha = (1 - frac) * 0.042;
            targetCtx.save();
            targetCtx.translate(center2D[0], center2D[1]);
            targetCtx.scale(1, ry / Math.max(1, rx));
            targetCtx.fillStyle = `rgba(${pal.rgb.join(',')},${alpha.toFixed(3)})`;
            targetCtx.beginPath();
            targetCtx.arc(0, 0, rx * 1.15 * frac, 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.restore();
          }
        } else {
          targetCtx.save();
          targetCtx.translate(center2D[0], center2D[1]);
          targetCtx.scale(1, ry / Math.max(1, rx));
          const poolGrad = targetCtx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.18);
          poolGrad.addColorStop(0, `rgba(${pal.rgb.join(',')},0.22)`);
          poolGrad.addColorStop(0.55, `rgba(${pal.rgb.join(',')},0.07)`);
          poolGrad.addColorStop(1, `rgba(${pal.rgb.join(',')},0)`);
          targetCtx.fillStyle = poolGrad;
          targetCtx.beginPath();
          targetCtx.arc(0, 0, rx * 1.18, 0, Math.PI * 2);
          targetCtx.fill();
          targetCtx.restore();
        }
      }
    }

    // 3. Draw Shaded Occluder Faces
    for (const tri of drawTris) {
      const { mesh, va, vb, vc, fn, isSectionCut } = tri;
      const [x0, y0] = va.proj;
      const [x1, y1] = vb.proj;
      const [x2, y2] = vc.proj;

      if (!xray) {
        let base = themeObj.body;
        if (mesh.role === 'recess') base = themeObj.recess;
        else if (mesh.role === 'anatomy') base = isLight ? [210, 195, 165] : [48, 42, 34];
        else if (fn[1] > 0.6) base = themeObj.deck;

        const dSun = Math.max(0, fn[0] * sunDir[0] + fn[1] * sunDir[1] + fn[2] * sunDir[2]);
        const dFill = Math.max(0, fn[0] * fillDir[0] + fn[1] * fillDir[1] + fn[2] * fillDir[2]);
        const shade = isLight ? 0.92 + dSun * 0.12 - (1 - fn[1]) * 0.04 : 0.85 + dSun * 0.32 + dFill * 0.10;

        let r = Math.min(255, Math.round(base[0] * shade));
        let g = Math.min(255, Math.round(base[1] * shade));
        let b = Math.min(255, Math.round(base[2] * shade));

        if (mesh.emissive > 0) {
          // Matches isoglow.dev's uAccentFill in light mode and emissive boost in dark mode
          const mix = isLight ? 0.88 : 0.78;
          r = Math.round(r * (1 - mix) + pal.rgb[0] * mix);
          g = Math.round(g * (1 - mix) + pal.rgb[1] * mix);
          b = Math.round(b * (1 - mix) + pal.rgb[2] * mix);
        } else if (isSectionCut) {
          r = Math.min(255, r + (isLight ? -18 : 22));
          g = Math.min(255, g + (isLight ? -18 : 16));
        }

        const col = `rgb(${r},${g},${b})`;
        targetCtx.beginPath();
        targetCtx.moveTo(x0, y0);
        targetCtx.lineTo(x1, y1);
        targetCtx.lineTo(x2, y2);
        targetCtx.closePath();
        targetCtx.fillStyle = col;
        targetCtx.fill();
        // 0.6px seam fill to prevent subpixel gaps between adjacent triangles
        targetCtx.strokeStyle = col;
        targetCtx.lineWidth = 0.65;
        targetCtx.stroke();
      } else {
        // X-Ray dark occluder fill so hidden rear lines are properly occluded!
        const occluder = isLight ? 'rgba(236,238,238,0.92)' : 'rgba(14,16,18,0.92)';
        targetCtx.beginPath();
        targetCtx.moveTo(x0, y0);
        targetCtx.lineTo(x1, y1);
        targetCtx.lineTo(x2, y2);
        targetCtx.closePath();
        targetCtx.fillStyle = occluder;
        targetCtx.fill();
      }

      if (mesh.keyId || mesh.partName) {
        hitPolygons.push({
          pts: [[x0, y0], [x1, y1], [x2, y2]],
          keyId: mesh.keyId || null,
          partName: mesh.partName,
        });
      }
    }

    // 4. Draw Surface Details (Reels, VU meters, Key icons) in Composite mode
    if (!xray) {
      draw3DSurfaceDetails(targetCtx, cam, pal, themeObj, sectionX);
    }

    // 5. Object-Space Line Extraction (when mode !== 'sobel')
    let totalMinor = 0;
    let totalMajor = 0;
    let totalGrown = 0;
    let totalPruned = 0;
    let totalSilhouettes = 0;

    const useHysteresis = mode === 'naive' ? false : state.hysteresis;
    const useHull = mode === 'naive' ? false : state.hullOutline;

    for (let mi = 0; mi < meshes.length; mi++) {
      const mesh = meshes[mi];
      const graph = graphs[mi];
      const off = mesh.worldOffset || [0, 0, 0];

      const { minor, major, grown, pruned } = selectCreaseEdges(graph, {
        thresholdDeg: state.edgeAngle,
        majorDeg: 60,
        hysteresis: useHysteresis,
        growFactor: 0.55,
        straightCos: 0.9,
        minLength: 0.06,
      });

      const silhouettes = useHull ? extractSilhouetteEdges(graph, cam, off) : [];

      totalMinor += minor.length;
      totalMajor += major.length;
      totalGrown += grown.length;
      totalPruned += pruned.length;
      totalSilhouettes += silhouettes.length;

      if (mode === 'sobel') continue;

      const drawEdgeList = (edgeList, strokeStyle, lineWidth = 1.0, dashed = false) => {
        if (!edgeList.length) return;
        targetCtx.save();
        targetCtx.strokeStyle = strokeStyle;
        targetCtx.lineWidth = lineWidth;
        targetCtx.lineCap = 'round';
        if (dashed) targetCtx.setLineDash([3, 3]);
        targetCtx.beginPath();

        for (const e of edgeList) {
          const ax = e.va[0] + off[0], ay = e.va[1] + off[1], az = e.va[2] + off[2];
          const bx = e.vb[0] + off[0], by = e.vb[1] + off[1], bz = e.vb[2] + off[2];
          if (ax > sectionX && bx > sectionX) continue;

          // Backface occlusion check for interior creases: at least one adjacent face must face the camera
          let visible = false;
          for (const n of e.normals) {
            const vn = normalToView(n, cam);
            if (vn[2] >= -0.05) {
              visible = true;
              break;
            }
          }
          if (!visible && sectionX === Infinity) continue;

          const p0 = projectPoint([ax, ay, az], cam);
          const p1 = projectPoint([bx, by, bz], cam);
          targetCtx.moveTo(p0[0], p0[1]);
          targetCtx.lineTo(p1[0], p1[1]);
        }
        targetCtx.stroke();
        targetCtx.restore();
      };

      const isLitKey = mesh.emissive > 0;
      if (xray) {
        drawEdgeList(pruned, '#fb7185', 1.2, true);
        drawEdgeList(minor, '#64748b', 1.15, false);
        drawEdgeList(major, '#ff9d3c', 1.45, false);
        drawEdgeList(grown, '#a3e635', 1.85, false);
        drawEdgeList(silhouettes, '#22d3ee', 2.0, false);
      } else {
        drawEdgeList(minor, isLitKey ? pal.hi : minCol, 1.0, false);
        drawEdgeList(major, isLitKey ? pal.hex : majCol, 1.15, false);
        drawEdgeList(silhouettes, isLitKey ? pal.hi : silCol, 1.4, false);
      }
    }

    // 6. Analytic Point Halos vs Downsampled Box Bloom (Dark mode only, per isoglow.dev light-theme polarity rule)
    if (!xray && !isLight) {
      const PLZ = 7, DX = 20, DY = 30, DZ = 11, DD = 170, DH = 44, DT = DZ + DH, DF = DY + DD;
      const deckLift = state.explode * 1.6 * 0.28;
      const keyLift = state.explode * 2.2 * 0.28;

      const glowEmitters = [];
      // REC front LED halo
      if (state.transport.rec) {
        glowEmitters.push({ pos: isoToWorld3D(DX + 214, DF + 0.5, DT - 22), lift: deckLift, radiusPx: 26, intensity: 0.9 });
      }
      // VU meter glass halo
      if (state.transport.mode !== 'stop' || state.transport.rec) {
        glowEmitters.push({ pos: isoToWorld3D(DX + 227, DY + 62, DT + 1), lift: deckLift, radiusPx: 68, intensity: 0.42 });
      }
      // Active transport key halo
      const keyIdx = { rew: 0, play: 1, ff: 2, stop: 3, rec: 4 }[state.transport.mode];
      if (keyIdx !== undefined && state.transport.mode !== 'stop') {
        const kx = DX + 16 + keyIdx * 49.6 + 23.2;
        glowEmitters.push({ pos: isoToWorld3D(kx, DY + 142, DT + 6), lift: keyLift, radiusPx: 54, intensity: 0.65 });
      }

      for (const em of glowEmitters) {
        const p = projectPoint([em.pos[0], em.pos[1] + em.lift, em.pos[2]], cam);
        if (state.glowMode === 'bloom') {
          // Simulate blocky 4x downsampled box bloom to illustrate why isoglow.dev rejected full-screen bloom
          const step = 10;
          const r = em.radiusPx * 1.25;
          for (let dy = -r; dy <= r; dy += step) {
            for (let dx = -r; dx <= r; dx += step) {
              const dist = Math.hypot(dx, dy) / r;
              if (dist > 1) continue;
              const { alpha } = evalPointGlow(dist, em.intensity * 0.85, 0);
              targetCtx.fillStyle = `rgba(${pal.rgb.join(',')},${(alpha * 0.55).toFixed(3)})`;
              targetCtx.fillRect(Math.round((p[0] + dx) / step) * step, Math.round((p[1] + dy) / step) * step, step - 1, step - 1);
            }
          }
        } else {
          // Analytic per-pixel smooth radial halo (glowPoints shader)
          const r = em.radiusPx;
          const g = targetCtx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
          const c0 = evalPointGlow(0.0, em.intensity, hashDither2D(p[0], p[1]));
          const cMid = evalPointGlow(0.35, em.intensity, 0);
          g.addColorStop(0, `rgba(255,255,255,${(c0.alpha * 0.7).toFixed(3)})`);
          g.addColorStop(0.18, `rgba(${pal.rgb.join(',')},${(c0.alpha * 0.65).toFixed(3)})`);
          g.addColorStop(0.5, `rgba(${pal.rgb.join(',')},${(cMid.alpha * 0.45).toFixed(3)})`);
          g.addColorStop(1, `rgba(${pal.rgb.join(',')},0)`);
          targetCtx.save();
          targetCtx.globalCompositeOperation = 'lighter';
          targetCtx.fillStyle = g;
          targetCtx.beginPath();
          targetCtx.arc(p[0], p[1], r, 0, Math.PI * 2);
          targetCtx.fill();
          targetCtx.restore();
        }
      }
    }

    return { totalMinor, totalMajor, totalGrown, totalPruned, totalSilhouettes };
  }

  function renderSobelOverlay(targetCtx, cam, xray, sectionX, pal, themeObj) {
    const { sceneMeshes: meshes } = getSceneData();
    const gCam = {
      ...cam,
      width: gbuf.width,
      height: gbuf.height,
    };
    rasterizeSceneToGBuffer(meshes, gCam, gbuf, { sectionX });
    const sobel = runSobelOutlinePass(gbuf, {
      baseDepthThreshold: 0.036,
      normalThreshold: 0.55,
      grazingModulation: state.grazingModulation,
      grazingK: state.grazingK,
      useObjectId: state.useObjectId,
    });

    const img = offscreenSobelCtx.createImageData(gbuf.width, gbuf.height);
    const data = img.data;
    const mask = sobel.mask;

    const fade = computeZoomWeightFade(cam.ppm, themeObj.fadeMin);
    const lineCol = themeObj.line;

    for (let i = 0; i < mask.length; i++) {
      const code = mask[i];
      if (!code) continue;
      const p = i * 4;
      if (xray) {
        // Color-coded by G-buffer Sobel trigger channel:
        // 1 = Depth (Cyan), 2 = Normal (Amber), 3 = Object-ID seam (Lime), 4 = False Grazing Artifact (Rose)
        if (code === 1) { data[p] = 34; data[p + 1] = 211; data[p + 2] = 238; data[p + 3] = 255; }
        else if (code === 2) { data[p] = 255; data[p + 1] = 157; data[p + 2] = 60; data[p + 3] = 255; }
        else if (code === 3) { data[p] = 163; data[p + 1] = 230; data[p + 2] = 53; data[p + 3] = 255; }
        else if (code === 4) { data[p] = 251; data[p + 1] = 113; data[p + 2] = 133; data[p + 3] = 255; }
      } else {
        if (code === 4) {
          // Highlight false grazing ink in warm warning rose-amber so the user immediately sees why N_z modulation is needed
          data[p] = 251; data[p + 1] = 113; data[p + 2] = 133; data[p + 3] = 215;
        } else {
          data[p] = lineCol[0];
          data[p + 1] = lineCol[1];
          data[p + 2] = lineCol[2];
          data[p + 3] = Math.round(240 * fade);
        }
      }
    }

    offscreenSobelCtx.putImageData(img, 0, 0);
    targetCtx.save();
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(offscreenSobelCanvas, 0, 0, cam.width, cam.height);
    targetCtx.restore();

    return sobel;
  }

  function render4UpGBufferInspector(targetCtx, cam, sectionX, pal, themeObj) {
    const { sceneMeshes: meshes } = getSceneData();
    const gCam = { ...cam, width: gbuf.width, height: gbuf.height };
    rasterizeSceneToGBuffer(meshes, gCam, gbuf, { sectionX });
    const sobel = runSobelOutlinePass(gbuf, {
      baseDepthThreshold: 0.036,
      normalThreshold: 0.55,
      grazingModulation: state.grazingModulation,
      grazingK: state.grazingK,
      useObjectId: state.useObjectId,
    });

    const W = cam.width, H = cam.height;
    const hw = Math.floor(W * 0.5), hh = Math.floor(H * 0.5);
    const gw = gbuf.width, gh = gbuf.height;
    const img = offscreenGbufCtx.createImageData(gw, gh);
    const d = img.data;

    const drawQuad = (qx, qy, title, sub, fillPixelFn) => {
      d.fill(0);
      for (let i = 0; i < gw * gh; i++) {
        fillPixelFn(i, i * 4);
      }
      offscreenGbufCtx.putImageData(img, 0, 0);
      targetCtx.save();
      targetCtx.imageSmoothingEnabled = false;
      targetCtx.drawImage(offscreenGbufCanvas, qx, qy, hw, hh);
      targetCtx.strokeStyle = 'rgba(138,143,148,0.35)';
      targetCtx.strokeRect(qx + 0.5, qy + 0.5, hw - 1, hh - 1);
      targetCtx.fillStyle = 'rgba(13,14,15,0.82)';
      targetCtx.fillRect(qx + 10, qy + 10, 250, 34);
      targetCtx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      targetCtx.fillStyle = pal.hex;
      targetCtx.fillText(title, qx + 18, qy + 25);
      targetCtx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      targetCtx.fillStyle = '#c9cdd1';
      targetCtx.fillText(sub, qx + 18, qy + 38);
      targetCtx.restore();
    };

    // Quad 1: View-Space Normal Buffer (Nx, Ny, Nz)
    drawQuad(0, 0, 'G-BUFFER 01 · VIEW NORMAL (N)', 'RGB = (Nx, Ny, Nz) * 0.5 + 0.5', (i, p) => {
      if (gbuf.depth[i] === Infinity) {
        d[p] = 18; d[p + 1] = 19; d[p + 2] = 20; d[p + 3] = 255;
        return;
      }
      d[p] = Math.round((gbuf.nx[i] * 0.5 + 0.5) * 255);
      d[p + 1] = Math.round((gbuf.ny[i] * 0.5 + 0.5) * 255);
      d[p + 2] = Math.round((gbuf.nz[i] * 0.5 + 0.5) * 255);
      d[p + 3] = 255;
    });

    // Quad 2: Linear Depth + Grazing Risk (1 - Nz)
    drawQuad(hw, 0, 'G-BUFFER 02 · DEPTH z & GRAZING (1-Nz)', 'Red tint = shallow grazing angle (Nz -> 0)', (i, p) => {
      const z = gbuf.depth[i];
      if (z === Infinity) {
        d[p] = 18; d[p + 1] = 19; d[p + 2] = 20; d[p + 3] = 255;
        return;
      }
      const normZ = Math.max(0, Math.min(1, 1 - (z - 4.0) / 4.2));
      const v = Math.round(40 + normZ * 195);
      const grazing = Math.max(0, 1 - gbuf.nz[i]);
      d[p] = Math.min(255, Math.round(v + grazing * 160));
      d[p + 1] = Math.round(v * (1 - grazing * 0.5));
      d[p + 2] = Math.round(v * (1 - grazing * 0.5));
      d[p + 3] = 255;
    });

    // Quad 3: Object / Part ID Channel
    drawQuad(0, hh, 'G-BUFFER 03 · OBJECT / PART ID', 'Resolves flush coplanar seams (Δz=0, ΔN=0)', (i, p) => {
      const id = gbuf.partId[i];
      if (!id) {
        d[p] = 18; d[p + 1] = 19; d[p + 2] = 20; d[p + 3] = 255;
        return;
      }
      d[p] = (id * 67 + 40) % 230 + 25;
      d[p + 1] = (id * 131 + 70) % 220 + 35;
      d[p + 2] = (id * 197 + 110) % 220 + 35;
      d[p + 3] = 255;
    });

    // Quad 4: Sobel Edge Classification Map
    drawQuad(hw, hh, 'PASS 04 · SOBEL EDGE CHANNELS', 'Cyan:Depth · Amber:Normal · Lime:ID · Rose:Grazing', (i, p) => {
      const code = sobel.mask[i];
      if (!code) {
        d[p] = 14; d[p + 1] = 15; d[p + 2] = 16; d[p + 3] = 255;
        return;
      }
      if (code === 1) { d[p] = 34; d[p + 1] = 211; d[p + 2] = 238; d[p + 3] = 255; }
      else if (code === 2) { d[p] = 255; d[p + 1] = 157; d[p + 2] = 60; d[p + 3] = 255; }
      else if (code === 3) { d[p] = 163; d[p + 1] = 230; d[p + 2] = 53; d[p + 3] = 255; }
      else { d[p] = 251; d[p + 1] = 113; d[p + 2] = 133; d[p + 3] = 255; }
    });

    const { sceneMeshes: mList, meshGraphs: gList } = getSceneData();
    let totalMinor = 0, totalMajor = 0, totalGrown = 0, totalPruned = 0;
    gList.forEach(g => {
      const c = selectCreaseEdges(g, { thresholdDeg: state.edgeAngle, hysteresis: state.hysteresis });
      totalMinor += c.minor.length;
      totalMajor += c.major.length;
      totalGrown += c.grown.length;
      totalPruned += c.pruned.length;
    });

    return {
      creaseStats: { totalMinor, totalMajor, totalGrown, totalPruned, totalSilhouettes: 0 },
      sobelStats: sobel,
    };
  }

  // ── Legend & Telemetry Updater ──
  let lastHudKey = '';
  function updateHudAndMetrics(creaseStats, sobelStats, cam, themeObj) {
    const fade = computeZoomWeightFade(cam.ppm, themeObj.fadeMin);
    const hudKey = [
      state.pipeline,
      state.viewMode,
      creaseStats.totalMinor,
      creaseStats.totalMajor,
      creaseStats.totalGrown,
      creaseStats.totalPruned,
      sobelStats.depthEdgeCount,
      sobelStats.normalEdgeCount,
      sobelStats.objectIdEdgeCount,
      sobelStats.falseGrazingCount,
      Math.round(cam.ppm),
      Math.round(state.elevationDeg),
      state.orthoMix > 0.5 ? 'O' : 'P',
    ].join('|');

    if (hudKey === lastHudKey) return;
    lastHudKey = hudKey;

    const pipeTitles = {
      isoglow: 'Iso-Glow Object-Space (Hysteresis + Hull)',
      naive: 'Naive EdgesGeometry (Per-Edge Dihedral Only)',
      sobel: 'Post-Processing Sobel (Depth + Normal + ID)',
      split: 'Split Comparison (Iso-Glow Left | Sobel Right)',
    };
    $('hud-pipeline-name').textContent = pipeTitles[state.pipeline] || state.pipeline;

    const legendEl = $('hud-legend');
    if (state.viewMode === 'xray') {
      if (state.pipeline === 'sobel') {
        legendEl.innerHTML = [
          ['#22d3ee', `Depth (${sobelStats.depthEdgeCount})`],
          ['#ff9d3c', `Normal (${sobelStats.normalEdgeCount})`],
          ['#a3e635', `Object-ID Seam (${sobelStats.objectIdEdgeCount})`],
          ['#fb7185', `False Grazing (${sobelStats.falseGrazingCount})`],
        ].map(([c, t]) => `<span class="legend-item"><i class="legend-swatch" style="background:${c}"></i>${t}</span>`).join('');
      } else {
        legendEl.innerHTML = [
          ['#22d3ee', `Hull Silhouette (${creaseStats.totalSilhouettes})`],
          ['#ff9d3c', `Major ≥60° (${creaseStats.totalMajor})`],
          ['#64748b', `Minor ≥${state.edgeAngle}° (${creaseStats.totalMinor})`],
          ['#a3e635', `Hysteresis Grown (${creaseStats.totalGrown})`],
          ['#fb7185', `Pruned <6cm (${creaseStats.totalPruned})`],
        ].map(([c, t]) => `<span class="legend-item"><i class="legend-swatch" style="background:${c}"></i>${t}</span>`).join('');
      }
      legendEl.hidden = false;
    } else if (state.pipeline === 'sobel' && sobelStats.falseGrazingCount > 0) {
      legendEl.innerHTML = `<span class="legend-item"><i class="legend-swatch" style="background:#fb7185"></i>Grazing depth artifact: ${sobelStats.falseGrazingCount} false interior edge pixels (enable View-Normal Modulation T_depth(N) to fix)</span>`;
      legendEl.hidden = false;
    } else {
      legendEl.hidden = true;
    }

    $('metric-creases').textContent = `${creaseStats.totalMinor + creaseStats.totalMajor} edges`;
    $('metric-creases-sub').textContent = `${creaseStats.totalMajor} major · +${creaseStats.totalGrown} hysteresis · −${creaseStats.totalPruned} pruned`;

    $('metric-sobel').textContent = `${sobelStats.totalEdgePixels} px`;
    $('metric-sobel-sub').textContent = `D:${sobelStats.depthEdgeCount} · N:${sobelStats.normalEdgeCount} · ID:${sobelStats.objectIdEdgeCount}`;

    if (sobelStats.falseGrazingCount > 0) {
      $('metric-health').textContent = `${sobelStats.falseGrazingCount} grazing err`;
      $('metric-health').style.color = '#fb7185';
    } else {
      $('metric-health').textContent = state.useObjectId ? 'Clean · Seams ON' : 'Missing ID Seams';
      $('metric-health').style.color = state.useObjectId ? '' : '#ff9d3c';
    }
    $('metric-health-sub').textContent = `Elev ${state.elevationDeg.toFixed(1)}° · Coplanar ID: ${sobelStats.objectIdEdgeCount} px`;

    $('metric-camera').textContent = `${state.orthoMix > 0.5 ? 'Ortho Iso' : 'Persp 28°'} · ${Math.round(cam.ppm)} ppm`;
    $('metric-camera-sub').textContent = `Line contrast fade: ${Math.round(fade * 100)}%`;
  }

  // ── Tab 2: 2D SVG <-> 3D Coordinate Kernel Renderer ──
  function render2DKernelTab() {
    const holder = $('svg-kernel-holder');
    if (!holder) return;
    const r = state.kernelRadius;
    const pal = PALETTES[state.accentKey];
    const themeObj = THEMES[state.theme];

    const OX = 210, OY = 95;
    const P = (x, y, z) => isoProject2D(x, y, z, OX, OY);
    const TOP = (x, y, z) => isoFaceMatrix2D('TOP', x, y, z, OX, OY);
    const FRONT = (x, y, z) => isoFaceMatrix2D('FRONT', x, y, z, OX, OY);
    const SIDE = (x, y, z) => isoFaceMatrix2D('SIDE', x, y, z, OX, OY);

    const drawSvgRoundedBox = (x, y, z, w, d, h, rad) => {
      rad = Math.min(rad, w / 2, d / 2);
      const n = 8, z1 = z + h, q = Math.PI / 4, H = Math.PI / 2;
      const arc = (cx, cy, a0, a1) => {
        const out = [];
        for (let i = 0; i <= n; i++) {
          const a = a0 + ((a1 - a0) * i) / n;
          out.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
        }
        return out;
      };
      const ring = [
        ...arc(x + w - rad, y + rad, -H, 0),
        ...arc(x + w - rad, y + d - rad, 0, H),
        ...arc(x + rad, y + d - rad, H, 2 * H),
        ...arc(x + rad, y + rad, 2 * H, 3 * H),
      ];
      const vis = [
        ...arc(x + w - rad, y + rad, -q, 0),
        ...arc(x + w - rad, y + d - rad, 0, H),
        ...arc(x + rad, y + d - rad, H, 3 * q),
      ];
      const d3 = pts => 'M' + pts.map(p => P(...p).map(v => v.toFixed(1)).join(' ')).join('L') + 'Z';
      const wall = [...vis.map(([a, b]) => [a, b, z]), ...vis.slice().reverse().map(([a, b]) => [a, b, z1])];
      const bodyFill = `rgb(${themeObj.body.join(',')})`;
      const topFill = `rgb(${themeObj.deck.join(',')})`;
      const stroke = `rgb(${themeObj.line.join(',')})`;
      return `<path fill="${bodyFill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round" d="${d3(wall)}"/>` +
             `<path fill="${topFill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round" d="${d3(ring.map(([a, b]) => [a, b, z1]))}"/>`;
    };

    const BX = 0, BY = 0, BZ = 0, BW = 150, BD = 105, BH = 42;
    let svg = `<svg viewBox="0 0 420 265" xmlns="http://www.w3.org/2000/svg">`;
    svg += drawSvgRoundedBox(BX, BY, BZ, BW, BD, BH, r);
    svg += `<g transform="${TOP(BX, BY, BZ + BH)}">
      <rect x="12" y="12" width="84" height="58" rx="4" fill="rgb(${themeObj.recess.join(',')})" stroke="${pal.hex}" stroke-width="1.2"/>
      <text x="20" y="32" fill="${pal.hex}" font-family="monospace" font-size="9" font-weight="600">TOP(x,y,z+h)</text>
      <text x="20" y="48" fill="${themeObj.ink}" font-family="monospace" font-size="7.5">r = ${r} cm</text>
      <circle cx="118" cy="40" r="14" fill="rgb(${themeObj.recess.join(',')})" stroke="rgb(${themeObj.line.join(',')})" stroke-width="1"/>
    </g>`;
    svg += `<g transform="${FRONT(BX, BY + BD, BZ + BH)}">
      <text x="14" y="24" fill="${themeObj.inkHi}" font-family="monospace" font-size="8.5">FRONT(x,y+d,z+h)</text>
    </g>`;
    svg += `<g transform="${SIDE(BX + BW, BY + BD, BZ + BH)}">
      <text x="14" y="24" fill="${themeObj.ink}" font-family="monospace" font-size="8">SIDE(x+w,y+d,z+h)</text>
    </g>`;
    svg += `</svg>`;
    holder.innerHTML = svg;

    $('kernel-code-readout').textContent =
`// Exact coordinate equivalence across 2D SVG and 3D WebGL in isoglow.dev:
// Box tuple: (x=${BX}, y=${BY}, z=${BZ}, w=${BW}, d=${BD}, h=${BH}, r=${r})

// 1. 2D SVG Isometric Kernel (demo/objects lines 2501-2531):
const P = (x, y, z) => [(x - y) * cos(30°) + OX, (x + y) * sin(30°) - z + OY];
// TOP affine matrix:   ${TOP(BX, BY, BZ + BH)}
// FRONT affine matrix: ${FRONT(BX, BY + BD, BZ + BH)}
// SIDE affine matrix:  ${SIDE(BX + BW, BY + BD, BZ + BH)}

// 2. 3D WebGL Extrusion (demo/gallery/3d.html lines 501-525):
const TS = 0.01; // 1 iso unit = 1 cm = 0.01 m
const W = (x, y, z) => new THREE.Vector3(x * TS, z * TS, y * TS);
// Corner [w, d, h] in 2D SVG -> [${P(BW, BD, BH).map(v => v.toFixed(1)).join(', ')}] px
// Corner [w, d, h] in 3D     -> [${isoToWorld3D(BW, BD, BH).map(v => v.toFixed(2)).join(', ')}] m`;
  }

  // ── Animation & Transport Loop ──
  let lastTime = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    // Smooth camera damping
    state.azimuthDeg += (state.targetAzimuthDeg - state.azimuthDeg) * Math.min(1, dt * 12);
    state.elevationDeg += (state.targetElevationDeg - state.elevationDeg) * Math.min(1, dt * 12);
    state.orthoMix += (state.targetOrthoMix - state.orthoMix) * Math.min(1, dt * 10);
    state.zoom += (state.targetZoom - state.zoom) * Math.min(1, dt * 12);

    // Advance tape transport
    const prevMode = state.transport.mode;
    state.transport = advanceTransportState(state.transport, dt);
    if (prevMode !== state.transport.mode) {
      if (state.transport.mode !== 'play') stopSynthAudio();
      syncTransportUI();
    }

    // Update VU meter ballistics
    const tSec = now / 1000;
    let tgtVu = [0, 0];
    if (state.transport.mode === 'play') {
      const ph = (tSec % EIGHTH) / EIGHTH;
      const beat = Math.floor(tSec / EIGHTH) % 2 === 0 ? 1 : 0.65;
      const base = 0.52 + 0.25 * beat * Math.exp(-ph * 3.2) + 0.07 * Math.sin(tSec * 2.4);
      tgtVu = [
        Math.min(1, base + 0.06 * Math.sin(tSec * 11.3)),
        Math.min(1, base - 0.04 + 0.07 * Math.cos(tSec * 9.7)),
      ];
    } else if (state.transport.rec) {
      tgtVu = [0.18 + 0.04 * Math.sin(tSec * 4), 0.18 + 0.04 * Math.cos(tSec * 4)];
    }
    state.transport.vu = state.transport.vu.map((v, i) =>
      tgtVu[i] > v ? tgtVu[i] : Math.max(0, v - dt * 1.6)
    );

    // Update transport text readout
    const cntStr = String(Math.floor(state.transport.count) % 1000).padStart(3, '0');
    const lBars = Math.ceil(Math.round(state.transport.vu[0] * 12) / 2);
    const rBars = Math.ceil(Math.round(state.transport.vu[1] * 12) / 2);
    const barStr = n => '▮'.repeat(n) + '▯'.repeat(Math.max(0, 6 - n));
    const modeLabel = state.transport.mode === 'play' && state.transport.rec
      ? 'REC·PLAY'
      : state.transport.mode.toUpperCase() + (state.transport.rec ? ' (ARMED)' : '');
    $('transport-readout').textContent = `${modeLabel} · ${cntStr} · L${barStr(lBars)} R${barStr(rBars)}`;

    if (state.tab === 'workbench') {
      renderWorkbenchFrame();
    }

    requestAnimationFrame(frame);
  }

  function renderWorkbenchFrame() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(300, Math.round(rect.width * dpr));
    const h = Math.max(220, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const pal = PALETTES[state.accentKey];
    const themeObj = THEMES[state.theme];
    const xray = state.viewMode === 'xray';

    // Clear background
    ctx.fillStyle = xray
      ? (state.theme === 'light' ? '#eef1f2' : '#090b0d')
      : `rgb(${themeObj.bg.join(',')})`;
    ctx.fillRect(0, 0, w, h);

    const cam = createCameraBasis({
      target: isoToWorld3D(160, 120, 32),
      azimuthDeg: state.azimuthDeg,
      elevationDeg: state.elevationDeg,
      distance: state.distance,
      fovDeg: 28,
      orthoMix: state.orthoMix,
      zoom: state.zoom,
      width: w,
      height: h,
    });

    const sectionX = state.sectionPct >= 99.5 ? Infinity : (state.sectionPct / 100) * 3.2;

    if (state.viewMode === 'gbuffer') {
      const { creaseStats, sobelStats } = render4UpGBufferInspector(ctx, cam, sectionX, pal, themeObj);
      updateHudAndMetrics(creaseStats, sobelStats, cam, themeObj);
      return;
    }

    let creaseStats;
    let sobelStats;

    if (state.pipeline === 'split') {
      const splitX = Math.round(w * state.splitRatio);

      // Left half: Iso-Glow Object-Space (Hysteresis + Hull)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, h);
      ctx.clip();
      creaseStats = renderShadedAndObjectPass(ctx, cam, 'isoglow', xray, sectionX, pal, themeObj);
      ctx.restore();

      // Right half: Image-Space Sobel G-Buffer
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, w - splitX, h);
      ctx.clip();
      renderShadedAndObjectPass(ctx, cam, 'sobel', xray, sectionX, pal, themeObj);
      sobelStats = renderSobelOverlay(ctx, cam, xray, sectionX, pal, themeObj);
      ctx.restore();

      // Split divider line & pill labels
      ctx.save();
      ctx.strokeStyle = pal.hex;
      ctx.lineWidth = Math.max(1.5, dpr * 1.5);
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, h);
      ctx.stroke();

      ctx.font = `${Math.round(10 * dpr)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.fillStyle = pal.hex;
      ctx.fillText('← ISO-GLOW OBJECT-SPACE', Math.max(12, splitX - 158 * dpr), h - 14 * dpr);
      ctx.fillText('SOBEL G-BUFFER →', splitX + 10 * dpr, h - 14 * dpr);
      ctx.restore();
    } else if (state.pipeline === 'sobel') {
      creaseStats = renderShadedAndObjectPass(ctx, cam, 'sobel', xray, sectionX, pal, themeObj);
      sobelStats = renderSobelOverlay(ctx, cam, xray, sectionX, pal, themeObj);
    } else {
      creaseStats = renderShadedAndObjectPass(ctx, cam, state.pipeline, xray, sectionX, pal, themeObj);
      // Compute background Sobel metrics for the telemetry comparison bar
      const { sceneMeshes: meshes } = getSceneData();
      const gCam = { ...cam, width: gbuf.width, height: gbuf.height };
      rasterizeSceneToGBuffer(meshes, gCam, gbuf, { sectionX });
      sobelStats = runSobelOutlinePass(gbuf, {
        baseDepthThreshold: 0.036,
        normalThreshold: 0.55,
        grazingModulation: state.grazingModulation,
        grazingK: state.grazingK,
        useObjectId: state.useObjectId,
      });
    }

    updateHudAndMetrics(creaseStats, sobelStats, cam, themeObj);
  }

  // ── UI Wiring & Event Listeners ──
  function setAccent(key) {
    if (!PALETTES[key]) key = 'ember';
    state.accentKey = key;
    const pal = PALETTES[key];
    document.documentElement.style.setProperty('--accent', pal.hex);
    document.documentElement.style.setProperty('--accent-hi', state.theme === 'light' ? pal.lightHi : pal.hi);
    document.querySelectorAll('#swatches button').forEach(b => {
      b.setAttribute('aria-checked', b.dataset.accent === key ? 'true' : 'false');
    });
    if (state.tab === 'kernel') render2DKernelTab();
  }

  function setTheme(nextTheme) {
    state.theme = nextTheme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = state.theme;
    setAccent(state.accentKey);
  }

  // Build accent swatches
  const swEl = $('swatches');
  swEl.innerHTML = Object.entries(PALETTES)
    .map(([k, p]) => `<button type="button" role="radio" data-accent="${k}" aria-label="${p.name}" title="${p.name}" style="--sw:${p.hex}" aria-checked="${k === state.accentKey}"><i></i></button>`)
    .join('');
  swEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-accent]');
    if (b) setAccent(b.dataset.accent);
  });

  // View tabs
  document.querySelectorAll('.view-tabs button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      document.querySelectorAll('.view-tabs button[data-tab]').forEach(b => {
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.hidden = p.id !== `panel-${state.tab}`;
      });
      if (state.tab === 'kernel') render2DKernelTab();
    });
  });

  // Ortho & Theme buttons
  $('btn-ortho').addEventListener('click', () => {
    state.targetOrthoMix = state.targetOrthoMix > 0.5 ? 0 : 1;
    $('btn-ortho').setAttribute('aria-pressed', state.targetOrthoMix > 0.5 ? 'true' : 'false');
    $('btn-ortho').textContent = state.targetOrthoMix > 0.5 ? 'Iso Ortho' : 'Persp 28°';
  });

  $('btn-theme').addEventListener('click', () => {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  // Pipeline & View Mode buttons
  document.querySelectorAll('[data-pipeline]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.pipeline = btn.dataset.pipeline;
      document.querySelectorAll('[data-pipeline]').forEach(b => b.classList.toggle('active', b === btn));
      $('row-split-pos').hidden = state.pipeline !== 'split';
    });
  });

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.viewMode = btn.dataset.view;
      document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Transport buttons (support hold-to-wind on FF/REW)
  document.querySelectorAll('.tkey-btn[data-tkey]').forEach(btn => {
    const k = btn.dataset.tkey;
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      triggerTransportKey(k);
      if ((k === 'ff' || k === 'rew') && state.transport.mode === k) {
        state.transport.holdKey = k;
        state.transport.holdStart = performance.now();
      }
    });
  });

  window.addEventListener('pointerup', () => {
    const h = state.transport.holdKey;
    if (h) {
      state.transport.holdKey = null;
      if (performance.now() - state.transport.holdStart > 350 && state.transport.mode === h) {
        setTransportMode('stop');
        syncTransportUI();
      }
    }
  });

  $('btn-audio-mute').addEventListener('click', () => {
    state.muted = !state.muted;
    $('btn-audio-mute').setAttribute('aria-pressed', state.muted ? 'true' : 'false');
    $('btn-audio-mute').querySelector('span').textContent = state.muted ? '🔇 Muted' : '🔊 Synth';
    if (state.muted) stopSynthAudio();
    else if (state.transport.mode === 'play') startSynthAudio();
  });

  // Sliders & Checkboxes
  const bindSlider = (id, outId, fmt, onChange) => {
    const el = $(id), out = $(outId);
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      if (out) out.textContent = fmt(v);
      onChange(v);
    });
  };

  bindSlider('rng-edge-angle', 'out-edge-angle', v => `${v}°`, v => { state.edgeAngle = v; });
  bindSlider('rng-split', 'out-split', v => `${v}%`, v => { state.splitRatio = v / 100; });
  bindSlider('rng-grazing-k', 'out-grazing-k', v => v.toFixed(1), v => { state.grazingK = v; });
  bindSlider('rng-explode', 'out-explode', v => `${v}%`, v => { state.explode = v / 100; });
  bindSlider('rng-section', 'out-section', v => `${v}%`, v => { state.sectionPct = v; });
  bindSlider('rng-kernel-r', 'out-kernel-r', v => `${v} cm`, v => {
    state.kernelRadius = v;
    render2DKernelTab();
  });

  $('chk-hysteresis').addEventListener('change', e => { state.hysteresis = e.target.checked; });
  $('chk-hull').addEventListener('change', e => { state.hullOutline = e.target.checked; });
  $('chk-grazing').addEventListener('change', e => { state.grazingModulation = e.target.checked; });
  $('chk-object-id').addEventListener('change', e => { state.useObjectId = e.target.checked; });
  $('chk-flush-keys').addEventListener('change', e => { state.flushCoplanarKeys = e.target.checked; });
  $('sel-glow-mode').addEventListener('change', e => { state.glowMode = e.target.value; });

  // Diagnostic Presets
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      if (p === 'default') {
        state.targetAzimuthDeg = 45;
        state.targetElevationDeg = 35.264389682754654;
        state.targetOrthoMix = 1;
        state.targetZoom = 1.0;
        state.pipeline = 'isoglow';
        state.viewMode = 'composite';
        state.explode = 0; $('rng-explode').value = 0; $('out-explode').textContent = '0%';
        state.sectionPct = 100; $('rng-section').value = 100; $('out-section').textContent = '100%';
        state.flushCoplanarKeys = false; $('chk-flush-keys').checked = false;
        state.grazingModulation = true; $('chk-grazing').checked = true;
        state.useObjectId = true; $('chk-object-id').checked = true;
      } else if (p === 'grazing') {
        // Tilt camera to shallow 11° grazing angle in Sobel mode and toggle grazing modulation off so user sees the artifact immediately
        state.targetAzimuthDeg = 42;
        state.targetElevationDeg = 11.5;
        state.targetOrthoMix = 1;
        state.pipeline = 'sobel';
        state.viewMode = 'composite';
        state.grazingModulation = false;
        $('chk-grazing').checked = false;
      } else if (p === 'coplanar') {
        state.targetAzimuthDeg = 45;
        state.targetElevationDeg = 42;
        state.pipeline = 'sobel';
        state.viewMode = 'xray';
        state.flushCoplanarKeys = true;
        $('chk-flush-keys').checked = true;
        state.useObjectId = true;
        $('chk-object-id').checked = true;
        state.grazingModulation = true;
        $('chk-grazing').checked = true;
      } else if (p === 'cutaway') {
        state.targetAzimuthDeg = 38;
        state.targetElevationDeg = 32;
        state.pipeline = 'isoglow';
        state.viewMode = 'composite';
        state.explode = 0.45; $('rng-explode').value = 45; $('out-explode').textContent = '45%';
        state.sectionPct = 62; $('rng-section').value = 62; $('out-section').textContent = '62%';
      }
      document.querySelectorAll('[data-pipeline]').forEach(b => b.classList.toggle('active', b.dataset.pipeline === state.pipeline));
      document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === state.viewMode));
      $('row-split-pos').hidden = state.pipeline !== 'split';
    });
  });

  // ── Canvas Orbit, Zoom, Split Drag, and 3D Part Picking ──
  let pointerDown = null;
  let draggingSplit = false;

  function pointInTri(px, py, [[x0, y0], [x1, y1], [x2, y2]]) {
    const d1 = (px - x1) * (y0 - y1) - (x0 - x1) * (py - y1);
    const d2 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    const d3 = (px - x0) * (y2 - y0) - (x2 - x0) * (py - y0);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos);
  }

  function pickAtCanvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    const x = (clientX - rect.left) * dpr;
    const y = (clientY - rect.top) * dpr;
    // Traverse front-to-back (reverse of painter's order)
    for (let i = hitPolygons.length - 1; i >= 0; i--) {
      if (pointInTri(x, y, hitPolygons[i].pts)) {
        return hitPolygons[i];
      }
    }
    return null;
  }

  canvas.addEventListener('pointerdown', e => {
    const rect = canvas.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
    if (state.pipeline === 'split' && Math.abs(relX - state.splitRatio) < 0.04) {
      draggingSplit = true;
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const hit = pickAtCanvasPos(e.clientX, e.clientY);
    if (hit && hit.keyId) {
      triggerTransportKey(hit.keyId);
      if ((hit.keyId === 'ff' || hit.keyId === 'rew') && state.transport.mode === hit.keyId) {
        state.transport.holdKey = hit.keyId;
        state.transport.holdStart = performance.now();
      }
      return;
    }

    pointerDown = {
      x: e.clientX,
      y: e.clientY,
      az: state.targetAzimuthDeg,
      el: state.targetElevationDeg,
      moved: false,
    };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    if (draggingSplit) {
      const relX = Math.max(0.1, Math.min(0.9, (e.clientX - rect.left) / Math.max(1, rect.width)));
      state.splitRatio = relX;
      $('rng-split').value = Math.round(relX * 100);
      $('out-split').textContent = `${Math.round(relX * 100)}%`;
      return;
    }
    if (pointerDown) {
      const dx = e.clientX - pointerDown.x;
      const dy = e.clientY - pointerDown.y;
      if (Math.hypot(dx, dy) > 3) pointerDown.moved = true;
      state.targetAzimuthDeg = pointerDown.az + dx * 0.45;
      state.targetElevationDeg = Math.max(6, Math.min(82, pointerDown.el + dy * 0.35));
      return;
    }
    // Hover part inspection
    if (state.viewMode !== 'gbuffer') {
      const hit = pickAtCanvasPos(e.clientX, e.clientY);
      const name = hit ? hit.partName : null;
      if (name !== state.hoveredPartName) {
        state.hoveredPartName = name;
        $('hud-part-hover').textContent = name
          ? `Inspecting part: ${name}${hit.keyId ? ' (click to actuate)' : ''}`
          : 'Drag to orbit · Scroll to zoom · Click transport keys or press Space';
      }
    }
  });

  canvas.addEventListener('pointerup', e => {
    draggingSplit = false;
    if (pointerDown && !pointerDown.moved) {
      const hit = pickAtCanvasPos(e.clientX, e.clientY);
      if (hit && hit.partName) {
        $('hud-part-hover').textContent = `Selected: ${hit.partName}`;
      }
    }
    pointerDown = null;
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0012);
    state.targetZoom = Math.max(0.45, Math.min(2.4, state.targetZoom * factor));
  }, { passive: false });

  // Keyboard shortcuts (matching isoglow.dev/demo/gallery/3d.html#cs)
  window.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    const KEYMAP = {
      ' ': 'play',
      ArrowLeft: 'rew',
      ArrowRight: 'ff',
      s: 'stop',
      S: 'stop',
      r: 'rec',
      R: 'rec',
    };
    if (KEYMAP[e.key]) {
      e.preventDefault();
      if (!e.repeat) {
        const k = KEYMAP[e.key];
        triggerTransportKey(k);
        if ((k === 'ff' || k === 'rew') && state.transport.mode === k) {
          state.transport.holdKey = k;
          state.transport.holdStart = performance.now();
        }
      }
      return;
    }
    if (e.key === 'i' || e.key === 'I') {
      e.preventDefault();
      $('btn-ortho').click();
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      $('btn-theme').click();
    } else if (e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      const nextView = state.viewMode === 'composite' ? 'xray' : state.viewMode === 'xray' ? 'gbuffer' : 'composite';
      document.querySelector(`[data-view="${nextView}"]`)?.click();
    }
  });

  window.addEventListener('keyup', e => {
    const KEYMAP = { ArrowLeft: 'rew', ArrowRight: 'ff' };
    const k = KEYMAP[e.key];
    if (k && state.transport.holdKey === k) {
      state.transport.holdKey = null;
      if (performance.now() - state.transport.holdStart > 350 && state.transport.mode === k) {
        setTransportMode('stop');
        syncTransportUI();
      }
    }
  });

  // Initialize UI & start loop
  setAccent('ember');
  syncTransportUI();
  render2DKernelTab();
  requestAnimationFrame(frame);
})();
