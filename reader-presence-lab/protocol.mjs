// Pure protocol, coordinate math, decay state machine, and Trystero-compatible virtual mesh
// derived from 100toolkit.com/live.js, 100toolkit.com/blog/chat.js, and /blog/*/index.html.

export const SLOPNAMES = [
  'tapestry', 'delve', 'pivotal', 'seamless', 'robust',
  'landscape', 'synergy', 'paradigm', 'testament', 'leverage',
  'holistic', 'vibrant', 'myriad', 'beacon', 'nuanced',
  'catalyst', 'bustling', 'unlock', 'elevate', 'realm'
];

export const COLORS = [
  '#d6452c', '#2f6fdf', '#1f9d6b', '#8a5cd6',
  '#c27a12', '#c2417f', '#16879a'
];

export function okColor(c, fallback = '#999999') {
  return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback;
}

export function pickIdentity(seedIndex = Math.floor(Math.random() * 1000)) {
  const idx = Math.abs(Math.floor(seedIndex));
  return {
    name: SLOPNAMES[idx % SLOPNAMES.length],
    color: COLORS[idx % COLORS.length]
  };
}

export function clamp01(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return 0;
  return Math.min(Math.max(v, 0), 1);
}

/**
 * Reading-position fraction used by #heat right-edge strip on both / and /blog/*.
 * frac = (scrollY + innerHeight * 0.4) / Math.max(scrollHeight, 1)
 */
export function computeReadingFrac(scrollY, innerHeight, docH) {
  const safeH = Math.max(docH || 1, 1);
  return clamp01((scrollY + innerHeight * 0.4) / safeH);
}

/**
 * Mode A: Whole-document fraction coordinates (100toolkit.com/live.js).
 */
export function encodePageFraction({ pageX, pageY, scrollY = 0, innerHeight = 800, docW = 1200, docH = 2400 }) {
  const w = Math.max(docW, 1);
  const h = Math.max(docH, 1);
  return {
    x: clamp01(pageX / w),
    y: clamp01(pageY / h),
    f: computeReadingFrac(scrollY, innerHeight, h)
  };
}

export function decodePageFraction(m, { docW = 1200, docH = 2400 }) {
  const w = Math.max(docW, 1);
  const h = Math.max(docH, 1);
  const hasXY = typeof m?.x === 'number' && typeof m?.y === 'number' && !Number.isNaN(m.x) && !Number.isNaN(m.y);
  return {
    hasCursor: hasXY,
    x: hasXY ? m.x * w : 0,
    y: hasXY ? m.y * h : 0,
    f: typeof m?.f === 'number' ? clamp01(m.f) : null
  };
}

/**
 * Mode B: Semantic block-anchored [data-k] relative coordinates (/blog/* essays).
 */
export function encodeBlockCoord({ clientX, clientY, blockIndex, blockRect }) {
  if (typeof blockIndex !== 'number' || blockIndex < 0 || !blockRect) return null;
  const w = Math.max(blockRect.width || 1, 1);
  const h = Math.max(blockRect.height || 1, 1);
  return {
    k: blockIndex,
    fx: clamp01((clientX - blockRect.left) / w),
    fy: clamp01((clientY - blockRect.top) / h)
  };
}

export function encodeScrollMarker({ innerHeight, blockRects }) {
  if (!Array.isArray(blockRects) || !blockRects.length) return null;
  const yMid = innerHeight * 0.4;
  const idx = blockRects.findIndex(r => r && r.top <= yMid && r.bottom >= yMid);
  if (idx < 0) return null;
  const r = blockRects[idx];
  const h = Math.max(r.height || 1, 1);
  return {
    k: idx,
    fx: 1,
    fy: clamp01((yMid - r.top) / h),
    t: 's'
  };
}

export function decodeBlockCoord(m, { blockRects, scrollX = 0, scrollY = 0, colRight = 760, innerWidth = 1200, docH = 2400, isNarrow = false }) {
  if (!m || typeof m !== 'object') return null;
  if (m.t === 'h') {
    return {
      mode: 'heat-only',
      f: typeof m.f === 'number' ? clamp01(m.f) : null
    };
  }
  const r = Array.isArray(blockRects) ? blockRects[m.k] : null;
  if (!r) return null;
  const fy = clamp01(typeof m.fy === 'number' ? m.fy : 0);
  const fx = clamp01(typeof m.fx === 'number' ? m.fx : 0);
  const y = r.top + scrollY + fy * r.height;
  const f = clamp01(y / Math.max(docH, 1));

  if (m.t === 's' || isNarrow) {
    const roomy = (innerWidth - colRight) > 110;
    const x = roomy ? colRight + 18 : innerWidth - 24;
    return {
      mode: 'margin-mark',
      k: m.k,
      x,
      y,
      f,
      roomy
    };
  }

  const x = r.left + scrollX + fx * r.width;
  return {
    mode: 'cursor',
    k: m.k,
    x,
    y,
    f,
    roomy: true
  };
}

/**
 * Quantifies why whole-page fraction coordinates drift horizontally when a centered prose column
 * (width colW) sits inside two different viewport widths (docWA vs docWB).
 */
export function computeColumnDrift({ fxInColumn, colW = 640, docWA = 1440, docWB = 760 }) {
  const leftA = Math.max((docWA - colW) / 2, 0);
  const leftB = Math.max((docWB - colW) / 2, 0);
  const pageXA = leftA + clamp01(fxInColumn) * colW;
  const pageFracX = pageXA / Math.max(docWA, 1);

  // Where Mode A (page fraction) places the cursor in Viewport B:
  const modeAXInB = pageFracX * docWB;
  // Where Mode B (block-anchored [data-k]) places the cursor in Viewport B:
  const modeBXInB = leftB + clamp01(fxInColumn) * colW;

  return {
    pageFracX,
    modeAXInB,
    modeBXInB,
    driftPx: modeAXInB - modeBXInB
  };
}

/**
 * Two-stage visual decay state machine from live.js & /blog/*:
 * - Stage 1 (0..1600ms): cursor opacity 0.55, label opacity 0.92 (.moving class)
 * - Stage 2 (1600..9000ms): cursor opacity 0.55, label opacity 0 (quiet pointer)
 * - Stage 3 (>=9000ms for cursor, >=20000ms for margin-mark): opacity 0 (dormant)
 */
export function evaluateCursorDecay(elapsedMs, mode = 'cursor') {
  const dt = Math.max(0, Number(elapsedMs) || 0);
  if (mode === 'margin-mark') {
    const visible = dt < 20000;
    return {
      phase: visible ? 'margin-active' : 'dormant',
      cursorOpacity: visible ? 1 : 0,
      labelOpacity: visible ? 1 : 0,
      movingClass: false,
      timeoutMs: 20000
    };
  }
  if (dt < 1600) {
    return {
      phase: 'moving',
      cursorOpacity: 0.55,
      labelOpacity: 0.92,
      movingClass: true,
      timeoutMs: 1600
    };
  }
  if (dt < 9000) {
    return {
      phase: 'quiet',
      cursorOpacity: 0.55,
      labelOpacity: 0,
      movingClass: false,
      timeoutMs: 9000
    };
  }
  return {
    phase: 'dormant',
    cursorOpacity: 0,
    labelOpacity: 0,
    movingClass: false,
    timeoutMs: 9000
  };
}

/**
 * Chat message sanitizer from 100toolkit.com/blog/chat.js: clean(m)
 */
export function cleanChatMessage(m, fallbackNow = Date.now()) {
  if (!m || typeof m.text !== 'string' || typeof m.id !== 'string' || m.id.length > 40) {
    return null;
  }
  const text = m.text.trim().slice(0, 280);
  if (!text) return null;
  return {
    id: m.id,
    name: String(m.name || 'reader').slice(0, 20),
    color: okColor(m.color, '#999999'),
    text,
    ts: Number(m.ts) || fallbackNow
  };
}

/**
 * Sliding-window per-peer rate limiter from 100toolkit.com/blog/chat.js:
 * Max 6 messages per 10,000ms sliding window per peerId (or "me").
 */
export class SlidingWindowRateLimiter {
  constructor({ windowMs = 10000, maxMessages = 6 } = {}) {
    this.windowMs = windowMs;
    this.maxMessages = maxMessages;
    this.rate = Object.create(null);
  }

  limited(peerId, now = Date.now()) {
    const key = String(peerId || 'anon');
    const history = (this.rate[key] || []).filter(t => now - t < this.windowMs);
    this.rate[key] = history;
    if (history.length >= this.maxMessages) {
      return true;
    }
    history.push(now);
    return false;
  }

  inspectPeer(peerId, now = Date.now()) {
    const key = String(peerId || 'anon');
    const history = (this.rate[key] || []).filter(t => now - t < this.windowMs);
    this.rate[key] = history;
    const oldest = history[0] ?? null;
    return {
      count: history.length,
      max: this.maxMessages,
      remaining: Math.max(0, this.maxMessages - history.length),
      blocked: history.length >= this.maxMessages,
      nextSlotInMs: oldest !== null ? Math.max(0, this.windowMs - (now - oldest)) : 0,
      timestamps: [...history]
    };
  }

  reset() {
    this.rate = Object.create(null);
  }
}

/**
 * G-Set chat log with deduplication by id, chronological sort, 60-item cap,
 * and 30-item peer-to-peer history catch-up payload (chat.js).
 */
export class ChatStore {
  constructor({ maxMessages = 60, historySlice = 30 } = {}) {
    this.maxMessages = maxMessages;
    this.historySlice = historySlice;
    this.msgs = [];
    this.seen = new Set();
  }

  add(rawMsg, mine = false, now = Date.now()) {
    const m = cleanChatMessage(rawMsg, now);
    if (!m || this.seen.has(m.id)) return null;
    this.seen.add(m.id);
    const entry = { ...m, mine: Boolean(mine) };
    this.msgs.push(entry);
    this.msgs.sort((a, b) => a.ts - b.ts);
    if (this.msgs.length > this.maxMessages) {
      this.msgs = this.msgs.slice(-this.maxMessages);
    }
    return entry;
  }

  mergeHistory(list, now = Date.now()) {
    if (!Array.isArray(list)) return 0;
    let added = 0;
    for (const d of list.slice(-this.historySlice)) {
      if (this.add(d, false, now)) added++;
    }
    return added;
  }

  getHistoryPayload() {
    return this.msgs.slice(-this.historySlice).map(({ id, name, color, text, ts }) => ({
      id, name, color, text, ts
    }));
  }
}

/**
 * Collaborative word-strike map from /blog/where-ai-slop-comes-from/
 */
export function applyStrikePacket(strikesMap, packet) {
  if (!packet || typeof packet.key !== 'string' || !/^[ab]:\d+$/.test(packet.key)) {
    return false;
  }
  if (packet.on && typeof packet.color === 'string' && /^#[0-9a-f]{6}$/i.test(packet.color)) {
    strikesMap[packet.key] = packet.color;
    return true;
  }
  if (!packet.on) {
    delete strikesMap[packet.key];
    return true;
  }
  return false;
}

export function mergeHelloStrikes(strikesMap, incomingStrikes) {
  if (!incomingStrikes || typeof incomingStrikes !== 'object') return 0;
  let merged = 0;
  for (const [k, c] of Object.entries(incomingStrikes)) {
    if (/^[ab]:\d+$/.test(k) && typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) {
      strikesMap[k] = c;
      merged++;
    }
  }
  return merged;
}

/**
 * Trystero-compatible virtual room mesh that connects in-page simulated viewports,
 * autonomous reader bots, AND cross-tab BroadcastChannel peers when opened in multiple tabs.
 */
export class VirtualTrysteroMesh {
  constructor({ latencyMs = 18, dropRate = 0, enableBroadcastChannel = false, channelName = '100toolkit-presence-lab' } = {}) {
    this.latencyMs = latencyMs;
    this.dropRate = dropRate;
    this.nodes = new Map(); // peerId -> VirtualRoomNode
    this.remoteTabs = new Set();
    this.frameLog = [];
    this.maxLog = 160;
    this.onFrame = null;
    this.bc = null;

    if (enableBroadcastChannel && typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(channelName);
        this.bc.onmessage = ev => this._handleBroadcastChannel(ev.data);
      } catch {
        this.bc = null;
      }
    }
  }

  joinRoom({ appId = '100toolkit-notes' } = {}, roomName = 'home', peerId = 'peer-' + Math.random().toString(36).slice(2, 8)) {
    const node = new VirtualRoomNode(this, appId, roomName, peerId);
    this.nodes.set(peerId, node);

    // Notify existing in-process nodes and the newly joined node
    for (const [otherId, otherNode] of this.nodes.entries()) {
      if (otherId === peerId || otherNode.roomName !== roomName || !otherNode.active) continue;
      this._schedule(() => {
        if (!node.active || !otherNode.active) return;
        otherNode._emitPeerJoin(peerId);
        node._emitPeerJoin(otherId);
      });
    }

    // Announce join to other browser tabs if BroadcastChannel is active
    this.bc?.postMessage({ type: 'peer-join', appId, roomName, peerId });
    return node;
  }

  _leaveNode(peerId) {
    const node = this.nodes.get(peerId);
    if (!node) return;
    this.nodes.delete(peerId);
    for (const [otherId, otherNode] of this.nodes.entries()) {
      if (otherId !== peerId && otherNode.roomName === node.roomName && otherNode.active) {
        otherNode._emitPeerLeave(peerId);
      }
    }
    this.bc?.postMessage({ type: 'peer-leave', roomName: node.roomName, peerId });
  }

  _sendAction(senderNode, actionLabel, payload, options = {}) {
    if (typeof actionLabel !== 'string' || actionLabel.length > 12) {
      throw new Error(`Trystero action label "${actionLabel}" exceeds 12 ASCII bytes`);
    }
    const targetId = options?.target || null;
    const bytes = JSON.stringify(payload ?? null).length;
    const frame = {
      id: this.frameLog.length + 1,
      ts: Date.now(),
      room: senderNode.roomName,
      action: actionLabel,
      from: senderNode.peerId,
      to: targetId || '*',
      bytes,
      payload: structuredClone ? structuredClone(payload) : JSON.parse(JSON.stringify(payload))
    };
    this.frameLog.push(frame);
    if (this.frameLog.length > this.maxLog) {
      this.frameLog = this.frameLog.slice(-this.maxLog);
    }
    this.onFrame?.(frame);

    for (const [otherId, otherNode] of this.nodes.entries()) {
      if (otherId === senderNode.peerId || !otherNode.active || otherNode.roomName !== senderNode.roomName) continue;
      if (targetId && otherId !== targetId) continue;
      if (this.dropRate > 0 && Math.random() < this.dropRate) continue;
      this._schedule(() => {
        if (!otherNode.active) return;
        otherNode._deliverAction(actionLabel, frame.payload, senderNode.peerId);
      });
    }

    this.bc?.postMessage({
      type: 'action',
      roomName: senderNode.roomName,
      action: actionLabel,
      from: senderNode.peerId,
      to: targetId,
      payload: frame.payload
    });
  }

  _handleBroadcastChannel(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'peer-join') {
      this.remoteTabs.add(msg.peerId);
      for (const node of this.nodes.values()) {
        if (node.active && node.roomName === msg.roomName && node.peerId !== msg.peerId) {
          node._emitPeerJoin(msg.peerId);
          this.bc?.postMessage({ type: 'peer-ack', roomName: node.roomName, peerId: node.peerId, target: msg.peerId });
        }
      }
    } else if (msg.type === 'peer-ack') {
      this.remoteTabs.add(msg.peerId);
      const targetNode = this.nodes.get(msg.target);
      if (targetNode && targetNode.active) {
        targetNode._emitPeerJoin(msg.peerId);
      }
    } else if (msg.type === 'peer-leave') {
      this.remoteTabs.delete(msg.peerId);
      for (const node of this.nodes.values()) {
        if (node.active && node.roomName === msg.roomName) {
          node._emitPeerLeave(msg.peerId);
        }
      }
    } else if (msg.type === 'action') {
      const bytes = JSON.stringify(msg.payload ?? null).length;
      const frame = {
        id: this.frameLog.length + 1,
        ts: Date.now(),
        room: msg.roomName,
        action: msg.action,
        from: msg.from,
        to: msg.to || '*',
        bytes,
        payload: msg.payload
      };
      this.frameLog.push(frame);
      if (this.frameLog.length > this.maxLog) this.frameLog = this.frameLog.slice(-this.maxLog);
      this.onFrame?.(frame);

      for (const [nodeId, node] of this.nodes.entries()) {
        if (!node.active || node.roomName !== msg.roomName) continue;
        if (msg.to && msg.to !== nodeId) continue;
        node._deliverAction(msg.action, msg.payload, msg.from);
      }
    }
  }

  _schedule(fn) {
    if (this.latencyMs <= 0) {
      fn();
    } else {
      setTimeout(fn, this.latencyMs);
    }
  }
}

class VirtualRoomNode {
  constructor(mesh, appId, roomName, peerId) {
    this.mesh = mesh;
    this.appId = appId;
    this.roomName = roomName;
    this.peerId = peerId;
    this.active = true;
    this.onPeerJoin = null;
    this.onPeerLeave = null;
    this.actions = new Map();
    this.knownPeers = new Set();
  }

  makeAction(label) {
    if (typeof label !== 'string' || label.length > 12) {
      throw new Error(`Trystero action label "${label}" exceeds 12 ASCII bytes`);
    }
    if (this.actions.has(label)) return this.actions.get(label);
    const handle = {
      label,
      onMessage: null,
      send: (payload, options) => {
        if (!this.active) return;
        this.mesh._sendAction(this, label, payload, options);
      }
    };
    this.actions.set(label, handle);
    return handle;
  }

  leave() {
    if (!this.active) return;
    this.active = false;
    this.knownPeers.clear();
    this.mesh._leaveNode(this.peerId);
  }

  _emitPeerJoin(otherId) {
    if (this.knownPeers.has(otherId)) return;
    this.knownPeers.add(otherId);
    this.onPeerJoin?.(otherId);
  }

  _emitPeerLeave(otherId) {
    if (!this.knownPeers.has(otherId)) return;
    this.knownPeers.delete(otherId);
    this.onPeerLeave?.(otherId);
  }

  _deliverAction(label, payload, fromPeerId) {
    const act = this.actions.get(label);
    act?.onMessage?.(payload, { peerId: fromPeerId });
  }
}
