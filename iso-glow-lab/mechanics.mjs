// Pure, DOM-free geometry, crease-extraction, G-buffer Sobel, and glow mechanics
// for the Iso-Glow 3D Architecture & Outline Pipelines study.

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const TAPE_MAX = 640;

export const PALETTES = {
  ember:  { name: 'Ember',  hex: '#ff9d3c', rgb: [255, 157, 60],  hi: '#ffd9a8', lightHi: '#7a3a00' },
  cyan:   { name: 'Cyan',   hex: '#22d3ee', rgb: [34, 211, 238],  hi: '#a5f3fc', lightHi: '#0e7490' },
  lime:   { name: 'Lime',   hex: '#a3e635', rgb: [163, 230, 53],  hi: '#d9f99d', lightHi: '#3f6212' },
  violet: { name: 'Violet', hex: '#a78bfa', rgb: [167, 139, 250], hi: '#ddd6fe', lightHi: '#5b21b6' },
  rose:   { name: 'Rose',   hex: '#fb7185', rgb: [251, 113, 133], hi: '#fecdd3', lightHi: '#9f1239' },
  ice:    { name: 'Ice',    hex: '#dfe9ef', rgb: [223, 233, 239], hi: '#ffffff', lightHi: '#1f2937' },
};

export const THEMES = {
  dark: {
    bg: [18, 19, 20],
    panel: [22, 23, 24],
    body: [27, 28, 31],
    deck: [32, 33, 36],
    recess: [15, 16, 17],
    line: [79, 83, 87],     // #4f5357 silhouette tier
    major: [57, 60, 63],    // #393c3f major crease tier (>= 60 deg)
    edge: [39, 41, 44],     // #27292c minor crease tier (>= thr deg)
    ink: '#868b8f',
    inkHi: '#e6e8e9',
    glassOff: '#141516',
    glassOn: '#22170f',
    fadeMin: 0.45,
    shadowOpacity: 0.55,
  },
  light: {
    bg: [233, 234, 234],
    panel: [246, 246, 245],
    body: [241, 241, 240],
    deck: [246, 246, 245],
    recess: [220, 221, 221],
    line: [93, 98, 102],    // #5d6266 silhouette tier
    major: [138, 143, 147], // #8a8f93 major crease tier
    edge: [185, 188, 191],  // #b9bcbf minor crease tier
    ink: '#6a6f73',
    inkHi: '#16181a',
    glassOff: '#e4e5e5',
    glassOn: '#f6ece2',
    fadeMin: 0.80,
    shadowOpacity: 0.14,
  },
};

// ── 1. Shared 2D SVG <-> 3D Coordinate Kernel ──
// In iso-glow's 2D figures: P(x,y,z) = [(x-y)*cos(30°)+OX, (x+y)*sin(30°)-z+OY]
// In iso-glow's 3D figures: W(x,y,z) = [x*TS, z*TS, y*TS] where TS = 0.01 (1 unit = 1 cm)
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

export function isoProject2D(x, y, z, ox = 0, oy = 0) {
  return [(x - y) * COS30 + ox, (x + y) * SIN30 - z + oy];
}

export function isoFaceMatrix2D(plane, x, y, z, ox = 0, oy = 0) {
  const o = isoProject2D(x, y, z, ox, oy);
  const d = (dx, dy, dz) => [(dx - dy) * COS30, (dx + dy) * SIN30 - dz];
  let u, v;
  if (plane === 'TOP') { u = d(1, 0, 0); v = d(0, 1, 0); }
  else if (plane === 'FRONT') { u = d(1, 0, 0); v = d(0, 0, -1); }
  else { u = d(0, -1, 0); v = d(0, 0, -1); } // SIDE
  return `matrix(${u[0].toFixed(4)} ${u[1].toFixed(4)} ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`;
}

export function isoToWorld3D(x, y, z, ts = 0.01) {
  return [x * ts, z * ts, y * ts];
}

// ── 2. Camera & Perspective <-> Orthographic Isometric Projection ──
// Matches isoglow.dev's exact frustum equivalence: orthoH = dist * 2 * tan(fov / 2)
export function fovScale(fovDeg = 28) {
  return 2 * Math.tan((fovDeg * DEG2RAD) / 2);
}

export function computeOrthoHeight(distance, fovDeg = 28, zoom = 1) {
  return (distance * fovScale(fovDeg)) / Math.max(1e-4, zoom);
}

export function computeZoomWeightFade(ppm, fadeMin = 0.45) {
  const k = Math.max(0, Math.min(1, (ppm / 40 - 0.35) / 0.65));
  return fadeMin + (1 - fadeMin) * k;
}

export function createCameraBasis({
  target = [1.6, 0.32, 1.2],
  azimuthDeg = 45,
  elevationDeg = 35.264389682754654, // atan(1 / sqrt(2)) true isometric elevation
  distance = 6.6,
  fovDeg = 28,
  orthoMix = 0, // 0 = perspective (28°), 1 = orthographic isometric
  zoom = 1,
  width = 800,
  height = 600,
} = {}) {
  const az = azimuthDeg * DEG2RAD;
  const el = elevationDeg * DEG2RAD;
  const cosEl = Math.cos(el);
  const dir = [
    Math.cos(az) * cosEl,
    Math.sin(el),
    Math.sin(az) * cosEl,
  ];
  const eye = [
    target[0] + dir[0] * distance,
    target[1] + dir[1] * distance,
    target[2] + dir[2] * distance,
  ];
  // Forward vector from eye to target: f = -dir
  const f = [-dir[0], -dir[1], -dir[2]];
  const upWorld = [0, 1, 0];
  // right = normalize(f x upWorld)
  let rx = f[1] * upWorld[2] - f[2] * upWorld[1];
  let ry = f[2] * upWorld[0] - f[0] * upWorld[2];
  let rz = f[0] * upWorld[1] - f[1] * upWorld[0];
  const rLen = Math.hypot(rx, ry, rz) || 1;
  const right = [rx / rLen, ry / rLen, rz / rLen];
  // up = right x f
  const up = [
    right[1] * f[2] - right[2] * f[1],
    right[2] * f[0] - right[0] * f[2],
    right[0] * f[1] - right[1] * f[0],
  ];

  const orthoH = computeOrthoHeight(distance, fovDeg, zoom);
  const aspect = width / Math.max(1, height);
  const ppm = height / orthoH;

  return {
    target,
    eye,
    dir,
    forward: f,
    right,
    up,
    distance,
    fovDeg,
    orthoMix: Math.max(0, Math.min(1, orthoMix)),
    zoom,
    orthoH,
    orthoW: orthoH * aspect,
    aspect,
    width,
    height,
    ppm,
  };
}

export function worldToView(pt, cam) {
  const dx = pt[0] - cam.eye[0];
  const dy = pt[1] - cam.eye[1];
  const dz = pt[2] - cam.eye[2];
  const vx = dx * cam.right[0] + dy * cam.right[1] + dz * cam.right[2];
  const vy = dx * cam.up[0] + dy * cam.up[1] + dz * cam.up[2];
  // View depth z is positive along forward ray (distance from camera eye plane)
  const vz = dx * cam.forward[0] + dy * cam.forward[1] + dz * cam.forward[2];
  return [vx, vy, vz];
}

export function normalToView(n, cam) {
  const nx = n[0] * cam.right[0] + n[1] * cam.right[1] + n[2] * cam.right[2];
  const ny = n[0] * cam.up[0] + n[1] * cam.up[1] + n[2] * cam.up[2];
  // N_z > 0 when normal faces toward the camera (-forward)
  const nz = -(n[0] * cam.forward[0] + n[1] * cam.forward[1] + n[2] * cam.forward[2]);
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

export function projectPoint(pt, cam) {
  const [vx, vy, vz] = worldToView(pt, cam);
  const safeZ = Math.max(0.1, vz);
  const perspH = computeOrthoHeight(safeZ, cam.fovDeg, cam.zoom);
  const effH = perspH * (1 - cam.orthoMix) + cam.orthoH * cam.orthoMix;
  const effW = effH * cam.aspect;
  const ndcX = (vx / (effW * 0.5));
  const ndcY = (vy / (effH * 0.5));
  const sx = (ndcX * 0.5 + 0.5) * cam.width;
  const sy = (0.5 - ndcY * 0.5) * cam.height;
  return [sx, sy, vz, vx, vy];
}

// ── 3. Procedural 3D Mesh Primitives (Rounded Extrusions & Cylinders) ──
// Matches isoglow.dev's rbox(x,y,z,w,d,h,r): rounded in plan, sharp top & bottom rims.
export function buildRoundedBoxMesh({
  x, y, z, w, d, h, r = 0,
  curveSegments = 6,
  partId = 1,
  partName = 'body',
  role = 'body',
  emissive = 0,
  explodeRank = 0,
  ts = 0.01,
}) {
  const rad = Math.max(0, Math.min(r, w * 0.5 - 0.01, d * 0.5 - 0.01));
  const ring = [];
  if (rad <= 0.05 || curveSegments <= 1) {
    ring.push([x, y], [x + w, y], [x + w, y + d], [x, y + d]);
  } else {
    const corners = [
      [x + w - rad, y + rad, -Math.PI * 0.5, 0],
      [x + w - rad, y + d - rad, 0, Math.PI * 0.5],
      [x + rad, y + d - rad, Math.PI * 0.5, Math.PI],
      [x + rad, y + rad, Math.PI, Math.PI * 1.5],
    ];
    for (const [cx, cy, a0, a1] of corners) {
      for (let i = 0; i <= curveSegments; i++) {
        // Avoid duplicating exact junction vertices when i === 0 if desired, or let mergeVertices weld them
        const a = a0 + ((a1 - a0) * i) / curveSegments;
        ring.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
      }
    }
  }

  const vertices = [];
  const faces = [];
  const n = ring.length;

  // Bottom ring: indices [0 .. n-1], Top ring: indices [n .. 2n-1]
  for (let i = 0; i < n; i++) {
    vertices.push(isoToWorld3D(ring[i][0], ring[i][1], z, ts));
  }
  for (let i = 0; i < n; i++) {
    vertices.push(isoToWorld3D(ring[i][0], ring[i][1], z + h, ts));
  }
  // Center vertices for fan triangulation of bottom and top caps
  const botCenterIdx = vertices.length;
  vertices.push(isoToWorld3D(x + w * 0.5, y + d * 0.5, z, ts));
  const topCenterIdx = vertices.length;
  vertices.push(isoToWorld3D(x + w * 0.5, y + d * 0.5, z + h, ts));

  // Side walls (outward normal in right-handed World [X=x, Y=z, Z=y])
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const b0 = i, b1 = next;
    const t0 = n + i, t1 = n + next;
    // In iso coords, ring goes clockwise in (x,y) from top-right -> bottom-right -> bottom-left -> top-left.
    // In World [X=x, Y=z, Z=y], (X, Z) is ring, Y is up.
    // Let's check cross product (b1 - b0) x (t0 - b0):
    // For front edge (y = y+d, x goes from x+w to x, so dX < 0, dZ = 0, and t0-b0 has dY > 0):
    // (-1, 0, 0) x (0, 1, 0) = (0, 0, -1). We want +Z outward on front face!
    // So winding (b0, t0, t1) and (b0, t1, b1) gives (0, 1, 0) x (-1, 0, 0) = (0, 0, +1).
    faces.push([b0, t0, t1], [b0, t1, b1]);
  }

  // Top cap (+Y normal): (topCenter, n + next, n + i)
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    faces.push([topCenterIdx, n + next, n + i]);
  }

  // Bottom cap (-Y normal): (botCenter, i, next)
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    faces.push([botCenterIdx, i, next]);
  }

  return finalizeMesh({ vertices, faces, partId, partName, role, emissive, explodeRank });
}

export function buildCylinderMesh({
  cx, cy, z, r, h,
  segments = 24,
  axis = 'z', // 'z' = vertical in iso (World Y), 'y' = front-facing in iso (World Z)
  partId = 1,
  partName = 'cylinder',
  role = 'body',
  emissive = 0,
  explodeRank = 0,
  ts = 0.01,
}) {
  const vertices = [];
  const faces = [];
  const n = segments;

  for (let pass = 0; pass < 2; pass++) {
    const u = pass === 0 ? 0 : h;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ca = Math.cos(a) * r;
      const sa = Math.sin(a) * r;
      if (axis === 'z') {
        vertices.push(isoToWorld3D(cx + ca, cy + sa, z + u, ts));
      } else {
        vertices.push(isoToWorld3D(cx + ca, cy + u, z + sa, ts));
      }
    }
  }

  const botCenterIdx = vertices.length;
  const topCenterIdx = vertices.length + 1;
  if (axis === 'z') {
    vertices.push(isoToWorld3D(cx, cy, z, ts));
    vertices.push(isoToWorld3D(cx, cy, z + h, ts));
  } else {
    vertices.push(isoToWorld3D(cx, cy, z, ts));
    vertices.push(isoToWorld3D(cx, cy + h, z, ts));
  }

  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const b0 = i, b1 = next;
    const t0 = n + i, t1 = n + next;
    if (axis === 'z') {
      faces.push([b0, t0, t1], [b0, t1, b1]);
      faces.push([topCenterIdx, t1, t0]);
      faces.push([botCenterIdx, b0, b1]);
    } else {
      faces.push([b0, t1, t0], [b0, b1, t1]);
      faces.push([topCenterIdx, t0, t1]);
      faces.push([botCenterIdx, b1, b0]);
    }
  }

  return finalizeMesh({ vertices, faces, partId, partName, role, emissive, explodeRank });
}

export function computeFaceNormal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  if (len < 1e-12) return [0, 0, 0];
  return [nx / len, ny / len, nz / len];
}

export function finalizeMesh(mesh) {
  const { vertices, faces } = mesh;
  const faceNormals = [];
  const validFaces = [];
  for (let i = 0; i < faces.length; i++) {
    const [ia, ib, ic] = faces[i];
    const n = computeFaceNormal(vertices[ia], vertices[ib], vertices[ic]);
    if (n[0] === 0 && n[1] === 0 && n[2] === 0) continue;
    validFaces.push([ia, ib, ic]);
    faceNormals.push(n);
  }
  return {
    ...mesh,
    faces: validFaces,
    faceNormals,
  };
}

// ── 4. Object-Space Crease Extraction (isoglow.dev Hysteresis vs. Naive EdgesGeometry) ──
// Reconstructs creaseInfo() and creaseLines() from https://isoglow.dev/demo/gallery/3d.html (lines 366-420):
// 1. Weld coincident vertices within tolerance (1e-4 m).
// 2. Build edge -> adjacent faces map and compute dihedral angle in degrees.
// 3. Seed edges with angle >= thresholdDeg.
// 4. If hysteresis is enabled, grow lines through softer neighboring edges (>= thresholdDeg * growFactor)
//    whose direction continues straight within straightCos (dot > 0.9, ~25°).
// 5. If minLength > 0, union-find connected active edges and prune chains shorter than minLength.
export function extractCreaseGraph(mesh, weldTolerance = 1e-4) {
  const invTol = 1 / weldTolerance;
  const vertMap = new Map();
  const weldedVerts = [];
  const remap = new Int32Array(mesh.vertices.length);

  for (let i = 0; i < mesh.vertices.length; i++) {
    const v = mesh.vertices[i];
    const key = `${Math.round(v[0] * invTol)},${Math.round(v[1] * invTol)},${Math.round(v[2] * invTol)}`;
    let idx = vertMap.get(key);
    if (idx === undefined) {
      idx = weldedVerts.length;
      weldedVerts.push(v);
      vertMap.set(key, idx);
    }
    remap[i] = idx;
  }

  const nV = weldedVerts.length;
  const faceNormals = [];
  const edgeFaces = new Map();

  for (let f = 0; f < mesh.faces.length; f++) {
    const [ra, rb, rc] = mesh.faces[f];
    const a = remap[ra], b = remap[rb], c = remap[rc];
    if (a === b || b === c || c === a) {
      faceNormals.push(null);
      continue;
    }
    const n = computeFaceNormal(weldedVerts[a], weldedVerts[b], weldedVerts[c]);
    if (n[0] === 0 && n[1] === 0 && n[2] === 0) {
      faceNormals.push(null);
      continue;
    }
    faceNormals.push(n);
    const pairs = [
      [a, b, f],
      [b, c, f],
      [c, a, f],
    ];
    for (const [u, v, fi] of pairs) {
      const lo = Math.min(u, v), hi = Math.max(u, v);
      const k = `${lo}:${hi}`;
      let list = edgeFaces.get(k);
      if (!list) {
        list = { a: lo, b: hi, faces: [] };
        edgeFaces.set(k, list);
      }
      list.faces.push(fi);
    }
  }

  const edges = [];
  const byVert = new Map();

  for (const item of edgeFaces.values()) {
    const { a, b, faces: fs } = item;
    const ns = fs.map(fi => faceNormals[fi]).filter(Boolean);
    if (ns.length === 0) continue;
    let ang = 180; // Open boundary edge
    if (ns.length >= 2) {
      ang = 0;
      for (let i = 1; i < ns.length; i++) {
        const dot = Math.max(-1, Math.min(1, ns[0][0] * ns[i][0] + ns[0][1] * ns[i][1] + ns[0][2] * ns[i][2]));
        ang = Math.max(ang, Math.acos(dot) * RAD2DEG);
      }
    }
    const va = weldedVerts[a], vb = weldedVerts[b];
    const dx = vb[0] - va[0], dy = vb[1] - va[1], dz = vb[2] - va[2];
    const len = Math.hypot(dx, dy, dz);
    if (len <= 1e-9) continue;
    const idx = edges.length;
    edges.push({
      index: idx,
      a,
      b,
      va,
      vb,
      ang,
      len,
      dir: [dx / len, dy / len, dz / len],
      faces: fs,
      normals: ns,
    });
    for (const v of [a, b]) {
      let arr = byVert.get(v);
      if (!arr) {
        arr = [];
        byVert.set(v, arr);
      }
      arr.push(idx);
    }
  }

  return { weldedVerts, edges, byVert, faceNormals };
}

export function selectCreaseEdges(
  graph,
  {
    thresholdDeg = 30,
    majorDeg = 60,
    hysteresis = true,
    growFactor = 0.55,
    straightCos = 0.9,
    minLength = 0.06,
  } = {}
) {
  const { edges, byVert } = graph;
  const on = new Uint8Array(edges.length); // 1 = seeded, 2 = hysteresis-grown
  const queue = [];

  for (let i = 0; i < edges.length; i++) {
    if (edges[i].ang >= thresholdDeg) {
      on[i] = 1;
      if (hysteresis) queue.push(i);
    }
  }

  if (hysteresis) {
    const low = thresholdDeg * growFactor;
    while (queue.length > 0) {
      const i = queue.pop();
      const e = edges[i];
      const endpoints = [
        [e.a, -1],
        [e.b, 1],
      ];
      for (const [v, outSign] of endpoints) {
        const neighbors = byVert.get(v) || [];
        for (const j of neighbors) {
          if (on[j]) continue;
          const f = edges[j];
          if (f.ang < low) continue;
          const fSign = f.a === v ? 1 : -1;
          const dot =
            (f.dir[0] * e.dir[0] + f.dir[1] * e.dir[1] + f.dir[2] * e.dir[2]) *
            fSign *
            outSign;
          if (dot > straightCos) {
            on[j] = 2; // Grown via hysteresis!
            queue.push(j);
          }
        }
      }
    }
  }

  // Union-Find over shared vertices to measure connected chain length and prune tiny fragments
  const parent = new Map();
  const find = x => {
    let curr = x;
    while (parent.get(curr) !== curr) {
      const p = parent.get(curr);
      parent.set(curr, parent.get(p));
      curr = p;
    }
    return curr;
  };

  for (let i = 0; i < edges.length; i++) {
    if (!on[i]) continue;
    const e = edges[i];
    if (!parent.has(e.a)) parent.set(e.a, e.a);
    if (!parent.has(e.b)) parent.set(e.b, e.b);
    parent.set(find(e.a), find(e.b));
  }

  const chainLength = new Map();
  for (let i = 0; i < edges.length; i++) {
    if (!on[i]) continue;
    const root = find(edges[i].a);
    chainLength.set(root, (chainLength.get(root) || 0) + edges[i].len);
  }

  const minor = [];
  const major = [];
  const grown = [];
  const pruned = [];
  const effMajorDeg = Math.max(thresholdDeg, majorDeg);

  for (let i = 0; i < edges.length; i++) {
    if (!on[i]) continue;
    const e = edges[i];
    const totalLen = chainLength.get(find(e.a)) || 0;
    if (hysteresis && minLength > 0 && totalLen < minLength) {
      pruned.push(e);
      continue;
    }
    if (on[i] === 2) {
      grown.push(e);
    }
    if (e.ang >= effMajorDeg) {
      major.push(e);
    } else {
      minor.push(e);
    }
  }

  return { minor, major, grown, pruned };
}

// Extracts true object-space silhouette edges (where one adjacent triangle faces the camera
// and the other faces away, equivalent to the visible rim of isoglow.dev's inverted-hull BackSide pass).
export function extractSilhouetteEdges(graph, cam, worldOffset = [0, 0, 0]) {
  const silhouettes = [];
  for (const e of graph.edges) {
    if (e.faces.length < 2) {
      silhouettes.push(e);
      continue;
    }
    const mid = [
      (e.va[0] + e.vb[0]) * 0.5 + worldOffset[0],
      (e.va[1] + e.vb[1]) * 0.5 + worldOffset[1],
      (e.va[2] + e.vb[2]) * 0.5 + worldOffset[2],
    ];
    // View vector from mid toward camera eye (for perspective) or -forward (for ortho)
    const vx = (cam.eye[0] - mid[0]) * (1 - cam.orthoMix) - cam.forward[0] * cam.orthoMix;
    const vy = (cam.eye[1] - mid[1]) * (1 - cam.orthoMix) - cam.forward[1] * cam.orthoMix;
    const vz = (cam.eye[2] - mid[2]) * (1 - cam.orthoMix) - cam.forward[2] * cam.orthoMix;

    let hasFront = false;
    let hasBack = false;
    for (const n of e.normals) {
      const facing = n[0] * vx + n[1] * vy + n[2] * vz;
      if (facing >= 0) hasFront = true;
      else hasBack = true;
    }
    if (hasFront && hasBack) {
      silhouettes.push(e);
    }
  }
  return silhouettes;
}

// ── 5. Image-Space G-Buffer Rasterizer & Sobel Outline Pipeline ──
// Implements the exact post-processing Sobel pipeline from CONTEXT.md:
// - Per-pixel Linear View Depth (z), View-Space Normal (Nx, Ny, Nz), and Object/Part ID.
// - View-normal depth threshold modulation: T_depth(N) = T_base * (1 + k * (1 - max(0, N_z)))
//   to prevent grazing-angle depth artifacts on flat surfaces.
// - Optional Object-ID seam detection for flush coplanar parts (e.g., recessed cassette keys).
export function createGBuffer(width, height) {
  const size = width * height;
  const depth = new Float32Array(size);
  depth.fill(Infinity);
  return {
    width,
    height,
    depth,
    nx: new Float32Array(size),
    ny: new Float32Array(size),
    nz: new Float32Array(size),
    partId: new Int16Array(size),
    roleId: new Uint8Array(size),
  };
}

export function rasterizeSceneToGBuffer(meshes, cam, gbuf, { sectionX = Infinity } = {}) {
  const { width, height, depth, nx, ny, nz, partId, roleId } = gbuf;
  depth.fill(Infinity);
  nx.fill(0);
  ny.fill(0);
  nz.fill(1);
  partId.fill(0);
  roleId.fill(0);

  for (const mesh of meshes) {
    if (mesh.visible === false) continue;
    const off = mesh.worldOffset || [0, 0, 0];
    const pVerts = mesh.vertices.map(v => {
      const wx = v[0] + off[0];
      const wy = v[1] + off[1];
      const wz = v[2] + off[2];
      return {
        wx,
        wy,
        wz,
        proj: projectPoint([wx, wy, wz], cam),
      };
    });

    const pId = mesh.partId || 1;
    const rId = mesh.role === 'key' ? 2 : mesh.role === 'recess' ? 3 : mesh.role === 'anatomy' ? 4 : 1;
    // Slight depth bias for coplanar inset/key parts (matches polygonOffset semantics)
    const zBias = mesh.depthBias || 0;

    for (let f = 0; f < mesh.faces.length; f++) {
      const [ia, ib, ic] = mesh.faces[f];
      const va = pVerts[ia], vb = pVerts[ib], vc = pVerts[ic];
      // Section plane clipping in world X
      if (va.wx > sectionX && vb.wx > sectionX && vc.wx > sectionX) continue;

      const fn = mesh.faceNormals[f];
      const vn = normalToView(fn, cam);
      // Backface culling (except when section plane is active and we see interior walls)
      if (vn[2] < -0.05 && sectionX === Infinity) continue;

      const [x0, y0, z0] = va.proj;
      const [x1, y1, z1] = vb.proj;
      const [x2, y2, z2] = vc.proj;

      const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
      const maxX = Math.min(width - 1, Math.ceil(Math.max(x0, x1, x2)));
      const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
      const maxY = Math.min(height - 1, Math.ceil(Math.max(y0, y1, y2)));
      if (minX > maxX || minY > maxY) continue;

      const denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
      if (Math.abs(denom) < 1e-5) continue;
      const invDenom = 1 / denom;

      for (let py = minY; py <= maxY; py++) {
        const cy = py + 0.5;
        for (let px = minX; px <= maxX; px++) {
          const cx = px + 0.5;
          const w0 = ((y1 - y2) * (cx - x2) + (x2 - x1) * (cy - y2)) * invDenom;
          const w1 = ((y2 - y0) * (cx - x2) + (x0 - x2) * (cy - y2)) * invDenom;
          const w2 = 1 - w0 - w1;
          if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;

          if (sectionX < Infinity) {
            const wx = w0 * va.wx + w1 * vb.wx + w2 * vc.wx;
            if (wx > sectionX) continue;
          }

          const pz = w0 * z0 + w1 * z1 + w2 * z2 + zBias;
          const idx = py * width + px;
          if (pz < depth[idx]) {
            depth[idx] = pz;
            nx[idx] = vn[0];
            ny[idx] = vn[1];
            nz[idx] = Math.abs(vn[2]);
            partId[idx] = pId;
            roleId[idx] = rId;
          }
        }
      }
    }
  }
  return gbuf;
}

export function depthThresholdForNormal(nz, baseThreshold = 0.045, grazingK = 4.5) {
  const clampedNz = Math.max(0, Math.min(1, nz));
  // As surface approaches grazing angle (N_z -> 0), depth gradient across 1 pixel scales by ~1/N_z.
  // Modulating T_depth(N) = T_base * (1 + k * (1 - N_z)^2 + 0.5 * k * (1 - N_z)) suppresses false grazing ink.
  const g = 1 - clampedNz;
  return baseThreshold * (1 + grazingK * (g + g * g * 1.5));
}

export function runSobelOutlinePass(
  gbuf,
  {
    baseDepthThreshold = 0.045,
    normalThreshold = 0.55,
    grazingModulation = true,
    grazingK = 4.5,
    useObjectId = true,
  } = {}
) {
  const { width, height, depth, nx, ny, nz, partId } = gbuf;
  const mask = new Uint8Array(width * height);
  // mask codes: 0 = none, 1 = depth edge, 2 = normal crease, 3 = objectId coplanar seam, 4 = false grazing depth artifact
  let depthEdgeCount = 0;
  let normalEdgeCount = 0;
  let objectIdEdgeCount = 0;
  let falseGrazingCount = 0;

  const KX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const KY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  // Replace Infinity background depth with a finite far plane so silhouettes have a clean jump
  const FAR = 25.0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const centerId = partId[idx];
      const centerZ = depth[idx] === Infinity ? FAR : depth[idx];
      const centerNz = nz[idx];

      let gxZ = 0, gyZ = 0;
      let gxNx = 0, gyNx = 0;
      let gxNy = 0, gyNy = 0;
      let gxNz = 0, gyNz = 0;
      let idDiff = false;

      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const row = (y + dy) * width;
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = row + (x + dx);
          const wx = KX[k], wy = KY[k];
          k++;
          const dz = depth[nIdx] === Infinity ? FAR : depth[nIdx];
          gxZ += wx * dz;
          gyZ += wy * dz;

          gxNx += wx * nx[nIdx];
          gyNx += wy * nx[nIdx];
          gxNy += wx * ny[nIdx];
          gyNy += wy * ny[nIdx];
          gxNz += wx * nz[nIdx];
          gyNz += wy * nz[nIdx];

          if (partId[nIdx] !== centerId) idDiff = true;
        }
      }

      const gradZ = Math.hypot(gxZ, gyZ) * 0.25;
      const gradN = (Math.hypot(gxNx, gyNx) + Math.hypot(gxNy, gyNy) + Math.hypot(gxNz, gyNz)) * 0.25;

      const modThresh = depthThresholdForNormal(centerNz, baseDepthThreshold, grazingK);
      const activeDepthThresh = grazingModulation ? modThresh : baseDepthThreshold;

      const isDepthEdge = gradZ > activeDepthThresh;
      const wouldBeSavedByGrazing = !grazingModulation && gradZ > baseDepthThreshold && gradZ <= modThresh;
      const isNormalEdge = gradN > normalThreshold;
      const isIdEdge = useObjectId && idDiff && !isDepthEdge && !isNormalEdge;

      if (wouldBeSavedByGrazing) {
        mask[idx] = 4; // Flagged as false grazing depth artifact!
        falseGrazingCount++;
      } else if (isDepthEdge) {
        mask[idx] = 1;
        depthEdgeCount++;
      } else if (isNormalEdge) {
        mask[idx] = 2;
        normalEdgeCount++;
      } else if (isIdEdge) {
        mask[idx] = 3;
        objectIdEdgeCount++;
      }
    }
  }

  return {
    mask,
    depthEdgeCount,
    normalEdgeCount,
    objectIdEdgeCount,
    falseGrazingCount,
    totalEdgePixels: depthEdgeCount + normalEdgeCount + objectIdEdgeCount + falseGrazingCount,
  };
}

// ── 6. Analytic Glow & Anti-Banding Hash Dither (from 3d.html lines 212, 274-283) ──
export function hashDither2D(x, y) {
  const dot = x * 12.9898 + y * 78.233;
  const s = Math.sin(dot) * 43758.5453;
  const frac = s - Math.floor(s);
  return (frac - 0.5) / 255.0;
}

export function evalPointGlow(normDist, intensity = 1, dither = 0) {
  if (normDist > 1.0 || intensity <= 0) return { alpha: 0, coreMix: 0 };
  const d = Math.max(0, normDist);
  const halo = Math.exp(-d * d * 9.0) * (1.0 - d);
  // smoothstep(0.05, 0.12, d)
  const t = Math.max(0, Math.min(1, (d - 0.05) / (0.12 - 0.05)));
  const core = 1.0 - t * t * (3.0 - 2.0 * t);
  const alpha = Math.max(0, Math.min(1, (halo * 0.7 + core * 0.9) * intensity + dither));
  return { alpha, coreMix: core * 0.6 };
}

// ── 7. C-07 Cassette Deck Transport Physics & Scene Builder ──
export const TRANSPORT_SPEED = { stop: 0, play: 1.25, ff: 26, rew: -26 };
export const TRANSPORT_SPIN = { stop: 0, play: 1.1, ff: 14, rew: -14 };

export function computeTapeReelRadii(count, maxTape = TAPE_MAX) {
  const f = Math.max(0, Math.min(1, count / maxTape));
  const rSupply = 6 + 13 * (1 - f);
  const rTakeup = 6 + 13 * f;
  // Take-up side turns faster when its radius is smaller (early in the tape)
  const supplyAngleMultiplier = 1 + (rTakeup - rSupply) / 40;
  return { fraction: f, rSupply, rTakeup, supplyAngleMultiplier };
}

export function advanceTransportState(state, dtSec) {
  const dt = Math.max(0, Math.min(2, dtSec));
  const mode = state.mode || 'stop';
  let count = Math.max(0, Math.min(TAPE_MAX, (state.count || 0) + (TRANSPORT_SPEED[mode] || 0) * dt));
  let ang = (state.ang || 0) + (TRANSPORT_SPIN[mode] || 0) * dt;
  let nextMode = mode;
  if (count <= 0 && mode === 'rew') nextMode = 'stop';
  if (count >= TAPE_MAX && mode !== 'rew' && mode !== 'stop') nextMode = 'stop';
  const { fraction, rSupply, rTakeup, supplyAngleMultiplier } = computeTapeReelRadii(count);
  return {
    ...state,
    mode: nextMode,
    count,
    ang,
    fraction,
    rSupply,
    rTakeup,
    supplyAngle: ang * supplyAngleMultiplier,
    takeupAngle: ang,
  };
}

// Builds the C-07 Three-Head Stereo Cassette Deck 3D meshes + internal anatomy
// using the exact dimensions from isoglow.dev/demo/gallery/3d.html (lines 1011-1084),
// plus internal capstan/head anatomy revealed during Explode or Section Cutaway.
export function buildCassetteDeckScene({
  filletSegments = 6,
  cylSegments = 24,
  explode = 0,
  keyStates = {},
  tapeFraction = 0.25,
} = {}) {
  const PLZ = 7, DX = 20, DY = 30, DZ = 11, DW = 280, DD = 170, DH = 44, DT = DZ + DH;
  const SX = 24, SY = 17;
  const meshes = [];

  const addMesh = (m, rank = 0, extraY = 0) => {
    const lift = explode * rank * 0.28 + extraY;
    m.worldOffset = [0, lift, 0];
    meshes.push(m);
    return m;
  };

  // 1. Base Plate (partId 1)
  addMesh(buildRoundedBoxMesh({
    x: 0, y: 0, z: 0, w: 320, d: 240, h: PLZ, r: 14,
    curveSegments: filletSegments,
    partId: 1, partName: 'Base plate', role: 'plate', explodeRank: 0,
  }), 0);

  // 2. Plinth (partId 2)
  addMesh(buildRoundedBoxMesh({
    x: DX + 6, y: DY + 6, z: PLZ, w: DW - 12, d: DD - 12, h: DZ - PLZ, r: 3,
    curveSegments: Math.max(2, filletSegments - 2),
    partId: 2, partName: 'Isolation plinth', role: 'body', explodeRank: 0.4,
  }), 0.4);

  // 3. Internal Anatomy: Capstan Flywheel, Motor, & 3-Head Block (partIds 20..23)
  addMesh(buildCylinderMesh({
    cx: DX + SX + 44, cy: DY + SY + 41, z: DZ + 6, r: 22, h: 10,
    segments: cylSegments,
    partId: 20, partName: 'Capstan brass flywheel', role: 'anatomy',
  }), 0.9);
  addMesh(buildCylinderMesh({
    cx: DX + SX + 96, cy: DY + SY + 41, z: DZ + 6, r: 18, h: 12,
    segments: cylSegments,
    partId: 21, partName: 'DC servo reel motor', role: 'anatomy',
  }), 0.9);
  addMesh(buildRoundedBoxMesh({
    x: DX + SX + 38, y: DY + SY + 68, z: DZ + 14, w: 64, d: 18, h: 18, r: 3,
    curveSegments: 4,
    partId: 22, partName: '3-Head block (Erase / Rec / Play)', role: 'anatomy',
  }), 1.1);
  addMesh(buildRoundedBoxMesh({
    x: DX + 190, y: DY + 16, z: DZ + 12, w: 74, d: 92, h: 14, r: 3,
    curveSegments: 3,
    partId: 23, partName: 'VU ballistic driver PCB', role: 'anatomy',
  }), 1.0);

  // 4. Main Deck Chassis (partId 3)
  addMesh(buildRoundedBoxMesh({
    x: DX, y: DY, z: DZ, w: DW, d: DD, h: DH, r: 8,
    curveSegments: filletSegments,
    partId: 3, partName: 'Main deck chassis', role: 'body',
  }), 1.6);

  // 5. Coplanar Recess Wells on Top Deck (partIds 4, 5, 6)
  // Notice these sit flush on z = DT (coplanar with top deck!), testing Object-ID vs Depth/Normal Sobel!
  const wellMesh = buildRoundedBoxMesh({
    x: DX + 12, y: DY + 10, z: DT - 0.2, w: 164, d: 104, h: 0.25, r: 6,
    curveSegments: 4,
    partId: 4, partName: 'Cassette well recess', role: 'recess',
  });
  wellMesh.depthBias = -0.002;
  addMesh(wellMesh, 1.8);

  const vuWellMesh = buildRoundedBoxMesh({
    x: DX + 186, y: DY + 10, z: DT - 0.2, w: 82, d: 104, h: 0.25, r: 6,
    curveSegments: 4,
    partId: 5, partName: 'Counter & VU bezel recess', role: 'recess',
  });
  vuWellMesh.depthBias = -0.002;
  addMesh(vuWellMesh, 1.8);

  const keyWellMesh = buildRoundedBoxMesh({
    x: DX + 12, y: DY + 122, z: DT - 0.2, w: 256, d: 40, h: 0.25, r: 4,
    curveSegments: 4,
    partId: 6, partName: 'Transport key well', role: 'recess',
  });
  keyWellMesh.depthBias = -0.002;
  addMesh(keyWellMesh, 1.8);

  // 6. C-60 Cassette Shell & Curved Cylindrical Tape Packs / Reels (partIds 7, 8, 9)
  addMesh(buildRoundedBoxMesh({
    x: DX + SX, y: DY + SY, z: DT, w: 140, d: 89, h: 4, r: 5,
    curveSegments: filletSegments,
    partId: 7, partName: 'C-60 cassette shell', role: 'cassette',
  }), 2.5);

  const rSup = 6 + 13 * (1 - tapeFraction);
  const rTak = 6 + 13 * tapeFraction;
  const supReel = buildCylinderMesh({
    cx: DX + SX + 44, cy: DY + SY + 41, z: DT + 4, r: rSup, h: 3.2,
    segments: cylSegments,
    partId: 8, partName: 'Supply tape pack & hub', role: 'reel',
  });
  supReel.depthBias = -0.003;
  addMesh(supReel, 2.9);

  const takReel = buildCylinderMesh({
    cx: DX + SX + 96, cy: DY + SY + 41, z: DT + 4, r: rTak, h: 3.2,
    segments: cylSegments,
    partId: 9, partName: 'Take-up tape pack & hub', role: 'reel',
  });
  takReel.depthBias = -0.003;
  addMesh(takReel, 2.9);

  // 7. Curved Rotary Level/Bias Calibration Drum (smooth cylinder on deck to test curved silhouettes)
  addMesh(buildCylinderMesh({
    cx: DX + 252, cy: DY + DD, z: DT - 22, r: 6.5, h: 4.5,
    segments: cylSegments,
    axis: 'y',
    partId: 10, partName: 'Phones level rotary cylinder', role: 'knob',
  }), 1.9);

  // 8. Five Transport Keys: REW, PLAY, FF, STOP, REC (partIds 11..15)
  // Can be set either raised (KH=6) or flush coplanar (KH=0.1) to test coplanar seam detection!
  const KEYS = [
    ['rew', 'REW', 11],
    ['play', 'PLAY', 12],
    ['ff', 'FF', 13],
    ['stop', 'STOP', 14],
    ['rec', 'REC', 15],
  ];
  const KW = 46.4, KST = 49.6, KD = 32;
  for (let i = 0; i < KEYS.length; i++) {
    const [k, label, pid] = KEYS[i];
    const kx = DX + 16 + i * KST, ky = DY + 126;
    const ks = keyStates[k] || {};
    const pressed = ks.pressed ? 0.022 : 0;
    const kh = ks.flushCoplanar ? 0.15 : 6;
    const km = buildRoundedBoxMesh({
      x: kx, y: ky, z: DT, w: KW, d: KD, h: kh, r: 2,
      curveSegments: 3,
      partId: pid,
      partName: `${label} transport key`,
      role: 'key',
      emissive: ks.lit ? 1 : 0,
    });
    km.keyId = k;
    km.keyLabel = label;
    km.depthBias = -0.004;
    addMesh(km, 2.2, -pressed);
  }

  return meshes;
}
