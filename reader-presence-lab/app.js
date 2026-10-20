import {
  SLOPNAMES,
  COLORS,
  okColor,
  pickIdentity,
  computeReadingFrac,
  encodePageFraction,
  decodePageFraction,
  encodeBlockCoord,
  encodeScrollMarker,
  decodeBlockCoord,
  computeColumnDrift,
  evaluateCursorDecay,
  cleanChatMessage,
  SlidingWindowRateLimiter,
  ChatStore,
  applyStrikePacket,
  mergeHelloStrikes,
  VirtualTrysteroMesh
} from './protocol.mjs';

const HERO_EXCERPTS = {
  before: {
    words: [
      'It', 'is', 'not', 'merely', 'a', 'tool,', 'but', 'a', 'pivotal',
      'testament', 'to', 'how', 'a', 'rich', 'tapestry', 'of', 'nuanced',
      'signals', 'can', 'delve', 'into', 'the', 'evolving', 'landscape',
      'and', 'unlock', 'seamless', 'synergy', 'across', 'every', 'realm.'
    ],
    tropes: new Set([2, 3, 6, 8, 9, 14, 16, 19, 22, 23, 25, 26, 27, 30])
  },
  after: {
    words: [
      'Two', 'neurons', 'in', 'layer', '27', 'drive', 'most', 'of',
      'the', 'contrastive', 'phrasing.', 'Clamping', 'both', 'during',
      'generation', 'cuts', 'the', 'trope', 'rate', 'to', 'zero',
      'without', 'changing', 'benchmark', 'accuracy', 'on', 'held-out', 'prompts.'
    ],
    tropes: new Set([])
  }
};

const CursorSVG = color =>
  `<svg width="10" height="13" viewBox="0 0 18 22"><path d="M1 1 L1 18 L6 13.5 L9.5 21 L12.5 19.6 L9 12.3 L16 12.3 Z" fill="${color}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Shared state
let seedCursor = 0;
let ME = pickIdentity(seedCursor++);
let heroAfter = false;
const strikes = { 'a:8': '#2f6fdf', 'a:14': '#1f9d6b', 'a:19': '#8a5cd6' };
let coordMode = 'block'; // 'block' | 'page'
let peerBNarrow = false;
let botsActive = !reducedMotion;
let lastTelemetry = null;

// Virtual Trystero Mesh with BroadcastChannel cross-tab bridge
const mesh = new VirtualTrysteroMesh({
  latencyMs: 16,
  dropRate: 0,
  enableBroadcastChannel: true,
  channelName: '100toolkit-presence-lab'
});

// DOM references
const meChip = document.getElementById('me-chip');
const rerollBtn = document.getElementById('reroll-me');
const selfTag = document.getElementById('self-tag');
const pill = document.getElementById('pill');
const whoReadout = document.getElementById('who-readout');
const hideBtn = document.getElementById('hide-btn');
const vpAScroll = document.getElementById('vp-a-scroll');
const vpALayer = document.getElementById('vp-a-layer');
const vpAHeat = document.getElementById('vp-a-heat');
const vpBScroll = document.getElementById('vp-b-scroll');
const vpBLayer = document.getElementById('vp-b-layer');
const vpBHeat = document.getElementById('vp-b-heat');
const vpBCard = document.getElementById('vp-b-card');
const driftReadout = document.getElementById('drift-readout');
const stageWireLog = document.getElementById('stage-wire-log');
const coordTelemetry = document.getElementById('coord-telemetry');

// Chat DOM references (100toolkit.com/blog/chat.js)
const chatBtn = document.getElementById('chatbtn');
const chatBox = document.getElementById('chatbox');
const chatClose = document.getElementById('chatclose');
const chatLog = document.getElementById('chatlog');
const chatForm = document.getElementById('chatform');
const chatInput = document.getElementById('chatinput');
const chatSend = document.getElementById('chatsend');
const chatToast = document.getElementById('chattoast');

const chatStore = new ChatStore();
const chatRateLimiter = new SlidingWindowRateLimiter({ windowMs: 10000, maxMessages: 6 });
let unread = 0;
let toastTimer = 0;

function updateMeBadge() {
  meChip.querySelector('i').style.background = ME.color;
  meChip.querySelector('b').textContent = ME.name;
  const span = selfTag.querySelector('span');
  span.style.background = ME.color;
  span.textContent = `${ME.name} · you`;
}
updateMeBadge();

// Render word-strike interactive boxes in both viewports
function renderWordStrikes() {
  const modeKey = heroAfter ? 'b' : 'a';
  const data = heroAfter ? HERO_EXCERPTS.after : HERO_EXCERPTS.before;

  for (const targetId of ['vp-a-strike-text', 'vp-b-strike-text']) {
    const container = document.getElementById(targetId);
    if (!container) continue;
    container.innerHTML = data.words.map((w, idx) => {
      const k = `${modeKey}:${idx}`;
      const cutColor = strikes[k];
      const classes = ['wd'];
      if (data.tropes.has(idx)) classes.push('trope');
      if (cutColor) classes.push('cut');
      const style = cutColor ? ` style="--cutc:${cutColor}"` : '';
      return `<span class="${classes.join(' ')}" data-w="${idx}"${style}>${w}</span>`;
    }).join(' ');
  }
}
renderWordStrikes();

document.getElementById('hero-before').onclick = () => {
  heroAfter = false;
  document.getElementById('hero-before').setAttribute('aria-pressed', 'true');
  document.getElementById('hero-after').setAttribute('aria-pressed', 'false');
  renderWordStrikes();
};
document.getElementById('hero-after').onclick = () => {
  heroAfter = true;
  document.getElementById('hero-before').setAttribute('aria-pressed', 'false');
  document.getElementById('hero-after').setAttribute('aria-pressed', 'true');
  renderWordStrikes();
};

// Primary Reader Room State (Viewport A)
let roomA = null;
let actA = {};
let peersA = {}; // peerId -> { name, color, el, mk, tk, lt, t }
let meTickA = null;

// Companion Receiver Room State (Viewport B)
const PEER_B_IDENTITY = { name: 'landscape', color: '#8a5cd6' };
let roomB = null;
let actB = {};
let peersB = {};
let ghostDriftElB = null;

function getBlocks(scrollEl) {
  return [...scrollEl.querySelectorAll('[data-k]')];
}

function getBlockRectsRelativeToScroll(scrollEl) {
  const sRect = scrollEl.getBoundingClientRect();
  return getBlocks(scrollEl).map(el => {
    const r = el.getBoundingClientRect();
    return {
      left: r.left - sRect.left,
      top: r.top - sRect.top,
      right: r.right - sRect.left,
      bottom: r.bottom - sRect.top,
      width: r.width,
      height: r.height
    };
  });
}

function updateHeatTick(heatContainer, holderObj, color, frac, isMe = false, visible = true) {
  if (!holderObj.tk) {
    const i = document.createElement('i');
    if (isMe) i.className = 'me';
    heatContainer.appendChild(i);
    holderObj.tk = i;
  }
  holderObj.tk.style.background = color;
  holderObj.tk.style.top = (Math.min(Math.max(frac, 0), 1) * 100) + '%';
  holderObj.tk.style.opacity = visible ? '' : '0';
}

function ensureCursorEl(layerEl, peerObj) {
  if (peerObj.el) return peerObj.el;
  const el = document.createElement('div');
  el.className = 'lv-cur';
  el.innerHTML = `${CursorSVG(peerObj.color)}<span style="background:${peerObj.color}"></span>`;
  el.querySelector('span').textContent = peerObj.name;
  layerEl.appendChild(el);
  peerObj.el = el;
  return el;
}

function ensureMarkerEl(layerEl, peerObj) {
  if (peerObj.mk) return peerObj.mk;
  const el = document.createElement('div');
  el.className = 'mark';
  const i = document.createElement('i');
  i.style.background = peerObj.color;
  i.textContent = (peerObj.name || '?')[0];
  const span = document.createElement('span');
  span.textContent = peerObj.name;
  el.append(i, span);
  layerEl.appendChild(el);
  peerObj.mk = el;
  return el;
}

function spawnPingInScroll(scrollEl, m, color) {
  const rects = getBlockRectsRelativeToScroll(scrollEl);
  const r = rects[m.k];
  if (!r) return;
  const d = document.createElement('div');
  d.className = 'ping';
  d.style.borderColor = color;
  d.style.left = (r.left + scrollEl.scrollLeft + m.fx * r.width) + 'px';
  d.style.top = (r.top + scrollEl.scrollTop + m.fy * r.height) + 'px';
  scrollEl.appendChild(d);
  setTimeout(() => d.remove(), 1100);
}

function placeRemoteInViewport(scrollEl, layerEl, heatEl, peersMap, peerId, m, isNarrowView = false) {
  const p = peersMap[peerId];
  if (!p) return;

  const docW = Math.max(scrollEl.scrollWidth, 1);
  const docH = Math.max(scrollEl.scrollHeight, 1);

  if (m.mode === 'page' || (typeof m.x === 'number' && typeof m.y === 'number' && m.k === undefined)) {
    const decoded = decodePageFraction(m, { docW, docH });
    if (decoded.f !== null) updateHeatTick(heatEl, p, p.color, decoded.f, false, true);
    if (!decoded.hasCursor) return;
    if (p.mk) p.mk.style.opacity = '0';
    const el = ensureCursorEl(layerEl, p);
    el.style.transform = `translate(${decoded.x}px, ${decoded.y}px)`;
    el.style.opacity = '0.55';
    el.classList.add('moving');
    clearTimeout(p.lt);
    p.lt = setTimeout(() => el.classList.remove('moving'), 1600);
    clearTimeout(p.t);
    p.t = setTimeout(() => { el.style.opacity = '0'; }, 9000);
    return;
  }

  const rects = getBlockRectsRelativeToScroll(scrollEl);
  const articleEl = scrollEl.querySelector('.reader-article');
  const sRect = scrollEl.getBoundingClientRect();
  const aRect = articleEl.getBoundingClientRect();
  const colRight = aRect.right - sRect.left;

  const placed = decodeBlockCoord(m, {
    blockRects: rects,
    scrollX: scrollEl.scrollLeft,
    scrollY: scrollEl.scrollTop,
    colRight,
    innerWidth: scrollEl.clientWidth,
    docH,
    isNarrow: isNarrowView
  });

  if (!placed) return;
  if (placed.f !== null) {
    updateHeatTick(heatEl, p, p.color, placed.f, false, true);
  }
  if (placed.mode === 'heat-only') return;

  clearTimeout(p.t);
  if (placed.mode === 'margin-mark') {
    if (p.el) p.el.style.opacity = '0';
    const mk = ensureMarkerEl(layerEl, p);
    mk.querySelector('span').style.display = placed.roomy ? '' : 'none';
    mk.style.transform = `translate(${placed.x}px, ${placed.y}px)`;
    mk.style.opacity = '1';
    p.t = setTimeout(() => { mk.style.opacity = '0'; }, 20000);
    return;
  }

  if (p.mk) p.mk.style.opacity = '0';
  const el = ensureCursorEl(layerEl, p);
  el.style.transform = `translate(${placed.x}px, ${placed.y}px)`;
  el.style.opacity = '0.55';
  el.classList.add('moving');
  clearTimeout(p.lt);
  p.lt = setTimeout(() => el.classList.remove('moving'), 1600);
  p.t = setTimeout(() => { el.style.opacity = '0'; }, 9000);
}

// Render #pill and top presence count (live.js + /blog/*)
function renderPresencePill() {
  const others = Object.values(peersA).filter(p => p.name && p.name !== '…');
  const count = others.length;
  whoReadout.innerHTML = `<span class="dot ${roomA && count ? 'on' : ''}"></span>` +
    (roomA ? (count ? `${count + 1} reading` : 'just you') : 'hidden');

  const chip = (p, isMe) =>
    `<span class="pchip${isMe ? ' pme' : ''}"><i style="background:${p.color}">${p.name[0]}</i><b>${p.name}</b>${isMe ? '<em> · you</em>' : ''}</span>`;

  pill.innerHTML = (roomA
    ? chip(ME, true) +
      others.slice(0, 4).map(p => chip(p, false)).join('') +
      (others.length > 4 ? `<span class="pmore">+${others.length - 4}</span>` : '')
    : `<span class="pmore">live readers hidden</span>`) +
    `<button type="button" id="pill-toggle-btn">${roomA ? 'hide' : 'show'}</button>`;

  document.getElementById('pill-toggle-btn').onclick = () => togglePresenceVisibility();
  chatBtn.style.display = roomA ? '' : 'none';
  hideBtn.setAttribute('aria-pressed', String(!roomA));
  hideBtn.textContent = roomA ? 'hide' : 'show readers';
}

// Readers' Chat UI & Logic (100toolkit.com/blog/chat.js)
function isChatOpen() {
  return chatBox.classList.contains('open');
}

function updateChatBadge() {
  chatBtn.classList.toggle('unread', unread > 0);
  chatBtn.querySelector('b').textContent = unread > 9 ? '9+' : (unread || '');
}

function showChatToast(m) {
  chatToast.textContent = '';
  const n = document.createElement('span');
  n.style.color = m.color;
  n.textContent = m.name;
  const p = document.createElement('p');
  p.append(n, document.createTextNode(m.text));
  chatToast.appendChild(p);
  chatToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => chatToast.classList.remove('show'), 5000);
}

function toggleChatBox(open) {
  chatBox.classList.toggle('open', open);
  chatBtn.setAttribute('aria-expanded', String(open));
  if (open) {
    chatToast.classList.remove('show');
    unread = 0;
    updateChatBadge();
    chatLog.scrollTop = chatLog.scrollHeight;
  }
}

function renderChatMessages() {
  chatLog.textContent = '';
  if (!roomA) {
    chatLog.innerHTML = '<p class="empty">Chat is off while you are hidden.</p>';
    chatInput.disabled = chatSend.disabled = true;
    chatInput.placeholder = 'Show yourself to chat';
    return;
  }
  chatInput.disabled = chatSend.disabled = false;
  if (chatInput.placeholder === 'Show yourself to chat') {
    chatInput.placeholder = 'Say something';
  }
  if (!chatStore.msgs.length) {
    chatLog.innerHTML = '<p class="empty">No messages yet. Anyone reading this page right now will see what you write.</p>';
    return;
  }
  for (const m of chatStore.msgs) {
    const d = document.createElement('div');
    d.className = 'msg' + (m.mine ? ' mine' : '');
    const n = document.createElement('span');
    n.style.color = m.color;
    n.textContent = m.name;
    const p = document.createElement('p');
    p.textContent = m.text;
    d.append(n, p);
    chatLog.appendChild(d);
  }
  chatLog.scrollTop = chatLog.scrollHeight;
}

chatBtn.onclick = () => toggleChatBox(!isChatOpen());
chatClose.onclick = () => toggleChatBox(false);
chatToast.onclick = () => {
  chatToast.classList.remove('show');
  toggleChatBox(true);
};
addEventListener('keydown', e => {
  if (e.key === 'Escape' && isChatOpen()) toggleChatBox(false);
});

chatForm.onsubmit = e => {
  e.preventDefault();
  if (!roomA) return;
  const text = chatInput.value.trim().slice(0, 280);
  if (!text) return;
  if (chatRateLimiter.limited('me')) {
    chatInput.value = '';
    chatInput.placeholder = 'Slow down a little';
    renderRateLimiterVisualizer();
    return;
  }
  chatInput.placeholder = 'Say something';
  const m = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    name: ME.name,
    color: ME.color,
    text,
    ts: Date.now()
  };
  chatStore.add(m, true);
  actA.chat?.send(m);
  chatInput.value = '';
  renderChatMessages();
  renderRateLimiterVisualizer();
};

// Connect Viewport A (Primary Reader) to VirtualTrysteroMesh
function joinPrimaryReader() {
  if (roomA) return;
  roomA = mesh.joinRoom({ appId: '100toolkit-notes' }, 'deslop-model', 'you-reader');
  for (const n of ['hello', 'move', 'strike', 'ping', 'chat', 'chathist']) {
    actA[n] = roomA.makeAction(n);
  }

  roomA.onPeerJoin = id => {
    peersA[id] = peersA[id] || { name: '…', color: '#999999' };
    actA.hello.send({ ...ME, strikes }, { target: id });
    if (chatStore.msgs.length) {
      actA.chathist.send(chatStore.getHistoryPayload(), { target: id });
    }
    renderPresencePill();
  };

  roomA.onPeerLeave = id => {
    const p = peersA[id];
    if (p) {
      p.el?.remove();
      p.mk?.remove();
      p.tk?.remove();
      delete peersA[id];
    }
    renderPresencePill();
  };

  actA.hello.onMessage = (d, { peerId }) => {
    const old = peersA[peerId] || {};
    old.el?.remove();
    old.mk?.remove();
    peersA[peerId] = {
      ...old,
      el: null,
      mk: null,
      name: String(d.name || 'reader').slice(0, 20),
      color: okColor(d.color, '#999999')
    };
    if (d.strikes && mergeHelloStrikes(strikes, d.strikes) > 0) {
      renderWordStrikes();
    }
    renderPresencePill();
  };

  actA.move.onMessage = (m, { peerId }) => {
    placeRemoteInViewport(vpAScroll, vpALayer, vpAHeat, peersA, peerId, m, false);
  };

  actA.ping.onMessage = (m, { peerId }) => {
    spawnPingInScroll(vpAScroll, m, peersA[peerId]?.color || '#999999');
  };

  actA.strike.onMessage = d => {
    if (applyStrikePacket(strikes, d)) {
      renderWordStrikes();
    }
  };

  actA.chat.onMessage = (d, { peerId }) => {
    if (chatRateLimiter.limited(peerId)) {
      renderRateLimiterVisualizer();
      return;
    }
    const added = chatStore.add(d, false);
    if (!added) return;
    if (!isChatOpen()) {
      unread++;
      updateChatBadge();
      showChatToast(added);
    }
    renderChatMessages();
    renderRateLimiterVisualizer();
  };

  actA.chathist.onMessage = list => {
    if (chatStore.mergeHistory(list) > 0) {
      renderChatMessages();
    }
  };

  const myFrac = computeReadingFrac(vpAScroll.scrollTop, vpAScroll.clientHeight, vpAScroll.scrollHeight);
  if (!meTickA) meTickA = {};
  updateHeatTick(vpAHeat, meTickA, ME.color, myFrac, true, true);
  renderPresencePill();
  renderChatMessages();
}

function leavePrimaryReader() {
  if (!roomA) return;
  roomA.leave();
  roomA = null;
  actA = {};
  for (const id of Object.keys(peersA)) {
    peersA[id].el?.remove();
    peersA[id].mk?.remove();
    peersA[id].tk?.remove();
  }
  peersA = {};
  if (meTickA?.tk) meTickA.tk.style.opacity = '0';
  selfTag.style.opacity = '0';
  renderPresencePill();
  renderChatMessages();
}

function togglePresenceVisibility() {
  if (roomA) leavePrimaryReader();
  else joinPrimaryReader();
}
hideBtn.onclick = () => togglePresenceVisibility();

// Connect Viewport B (Companion Peer Receiver Mirror)
function joinCompanionViewportB() {
  roomB = mesh.joinRoom({ appId: '100toolkit-notes' }, 'deslop-model', 'peer-b-mirror');
  for (const n of ['hello', 'move', 'strike', 'ping', 'chat', 'chathist']) {
    actB[n] = roomB.makeAction(n);
  }
  roomB.onPeerJoin = id => {
    peersB[id] = peersB[id] || { name: '…', color: '#999999' };
    actB.hello.send({ ...PEER_B_IDENTITY, strikes }, { target: id });
  };
  roomB.onPeerLeave = id => {
    const p = peersB[id];
    if (p) {
      p.el?.remove();
      p.mk?.remove();
      p.tk?.remove();
      delete peersB[id];
    }
  };
  actB.hello.onMessage = (d, { peerId }) => {
    const old = peersB[peerId] || {};
    old.el?.remove();
    old.mk?.remove();
    peersB[peerId] = {
      ...old,
      el: null,
      mk: null,
      name: String(d.name || 'reader').slice(0, 20),
      color: okColor(d.color, '#999999')
    };
  };
  actB.move.onMessage = (m, { peerId }) => {
    placeRemoteInViewport(vpBScroll, vpBLayer, vpBHeat, peersB, peerId, m, peerBNarrow);
  };
  actB.ping.onMessage = (m, { peerId }) => {
    spawnPingInScroll(vpBScroll, m, peersB[peerId]?.color || '#999999');
  };
}

// Autonomous Simulated Readers (delve, pivotal, seamless)
const bots = [
  { id: 'bot-delve', name: 'delve', color: '#2f6fdf', k: 0, fx: 0.25, fy: 0.4, phase: 0.2 },
  { id: 'bot-pivotal', name: 'pivotal', color: '#1f9d6b', k: 1, fx: 0.6, fy: 0.5, phase: 2.1 }
];

function connectBots() {
  for (const bot of bots) {
    const r = mesh.joinRoom({ appId: '100toolkit-notes' }, 'deslop-model', bot.id);
    bot.room = r;
    bot.act = {
      hello: r.makeAction('hello'),
      move: r.makeAction('move'),
      ping: r.makeAction('ping'),
      strike: r.makeAction('strike'),
      chat: r.makeAction('chat'),
      chathist: r.makeAction('chathist')
    };
    r.onPeerJoin = targetId => {
      bot.act.hello.send({ name: bot.name, color: bot.color, strikes }, { target: targetId });
      if (chatStore.msgs.length) {
        bot.act.chathist.send(chatStore.getHistoryPayload(), { target: targetId });
      }
    };
  }
}

// Seed initial welcome messages in ChatStore so late-joiner catch-up is immediately demonstrable
chatStore.add({
  id: 'seed-1',
  name: 'delve',
  color: '#2f6fdf',
  text: 'No backend server here: Trystero signals over public Nostr relays and opens direct WebRTC DataChannels.',
  ts: Date.now() - 42000
}, false);
chatStore.add({
  id: 'seed-2',
  name: 'pivotal',
  color: '#1f9d6b',
  text: 'Try clicking a word in the excerpt above or clicking "+ late joiner" to watch peer-to-peer chathist gossip.',
  ts: Date.now() - 18000
}, false);

joinCompanionViewportB();
connectBots();
joinPrimaryReader();

// Wire Log Inspector Hook
function renderWireFrame(frame) {
  if (!stageWireLog) return;
  const row = document.createElement('div');
  row.className = 'wire-row';
  const tag = document.createElement('span');
  tag.className = 'wire-tag';
  tag.textContent = frame.action;
  const route = document.createElement('span');
  route.style.color = 'var(--muted)';
  route.textContent = `${frame.from} → ${frame.to} (${frame.bytes}B)`;
  const payload = document.createElement('span');
  payload.className = 'wire-payload';
  payload.textContent = JSON.stringify(frame.payload);
  row.append(tag, route, payload);
  stageWireLog.prepend(row);
  while (stageWireLog.children.length > 45) {
    stageWireLog.lastElementChild.remove();
  }
}
mesh.onFrame = renderWireFrame;

// Pointer, Scroll, Double-Click Ping, and Word-Strike Handlers on Viewport A
let lastMoveTs = 0;
vpAScroll.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  selfTag.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  selfTag.style.opacity = roomA ? '1' : '0';

  if (!roomA) return;
  const now = performance.now();
  const throttleMs = coordMode === 'page' ? 60 : 50;
  if (now - lastMoveTs < throttleMs) return;
  lastMoveTs = now;

  const sRect = vpAScroll.getBoundingClientRect();
  const pageX = (e.clientX - sRect.left) + vpAScroll.scrollLeft;
  const pageY = (e.clientY - sRect.top) + vpAScroll.scrollTop;
  const docW = Math.max(vpAScroll.scrollWidth, 1);
  const docH = Math.max(vpAScroll.scrollHeight, 1);

  const pagePkt = encodePageFraction({
    pageX,
    pageY,
    scrollY: vpAScroll.scrollTop,
    innerHeight: vpAScroll.clientHeight,
    docW,
    docH
  });

  const blockEl = e.target.closest?.('[data-k]');
  let blockPkt = null;
  if (blockEl) {
    const blocks = getBlocks(vpAScroll);
    const k = blocks.indexOf(blockEl);
    const bRect = blockEl.getBoundingClientRect();
    blockPkt = encodeBlockCoord({
      clientX: e.clientX,
      clientY: e.clientY,
      blockIndex: k,
      blockRect: bRect
    });
  }

  if (coordMode === 'page') {
    actA.move?.send({ ...pagePkt, mode: 'page' });
  } else if (blockPkt) {
    actA.move?.send(blockPkt);
  }

  // Update Ghost Drift Overlay & Telemetry in Viewport B
  if (blockPkt) {
    const rectsB = getBlockRectsRelativeToScroll(vpBScroll);
    const rB = rectsB[blockPkt.k];
    if (rB) {
      const exactX = rB.left + vpBScroll.scrollLeft + blockPkt.fx * rB.width;
      const exactY = rB.top + vpBScroll.scrollTop + blockPkt.fy * rB.height;
      const pageXInB = pagePkt.x * Math.max(vpBScroll.scrollWidth, 1);
      const driftPx = Math.round(pageXInB - exactX);

      driftReadout.textContent = `page-fraction drift: ${driftPx >= 0 ? '+' : ''}${driftPx}px`;
      if (!ghostDriftElB) {
        ghostDriftElB = document.createElement('div');
        ghostDriftElB.className = 'lv-cur ghost-drift moving';
        ghostDriftElB.innerHTML = `${CursorSVG('#64748b')}<span>page-frac x/docW</span>`;
        vpBLayer.appendChild(ghostDriftElB);
      }
      ghostDriftElB.style.transform = `translate(${pageXInB}px, ${exactY}px)`;

      lastTelemetry = {
        k: blockPkt.k,
        fx: blockPkt.fx.toFixed(3),
        fy: blockPkt.fy.toFixed(3),
        pageXFrac: pagePkt.x.toFixed(3),
        pageYFrac: pagePkt.y.toFixed(3),
        driftPx
      };
      coordTelemetry.innerHTML =
        `<div><strong>[data-k="${lastTelemetry.k}"] Block Packet:</strong> <code>{k: ${lastTelemetry.k}, fx: ${lastTelemetry.fx}, fy: ${lastTelemetry.fy}}</code></div>` +
        `<div><strong>Landing Page-Fraction Packet:</strong> <code>{x: ${lastTelemetry.pageXFrac}, y: ${lastTelemetry.pageYFrac}, f: ${pagePkt.f.toFixed(3)}}</code></div>` +
        `<div><strong>Horizontal Error in Viewport B:</strong> <span style="color:var(--accent)">${driftPx >= 0 ? '+' : ''}${driftPx} px</span> (gray dashed cursor shows where un-anchored <code>x * docW()</code> lands)</div>`;
    }
  }
}, { passive: true });

vpAScroll.addEventListener('pointerleave', () => {
  selfTag.style.opacity = '0';
});

vpAScroll.addEventListener('dblclick', e => {
  const blockEl = e.target.closest?.('[data-k]');
  if (!blockEl) return;
  const blocks = getBlocks(vpAScroll);
  const k = blocks.indexOf(blockEl);
  const bRect = blockEl.getBoundingClientRect();
  const pkt = encodeBlockCoord({ clientX: e.clientX, clientY: e.clientY, blockIndex: k, blockRect: bRect });
  if (!pkt) return;
  spawnPingInScroll(vpAScroll, pkt, ME.color);
  actA.ping?.send(pkt);
});

let lastScrollSend = 0;
vpAScroll.addEventListener('scroll', () => {
  const frac = computeReadingFrac(vpAScroll.scrollTop, vpAScroll.clientHeight, vpAScroll.scrollHeight);
  if (!meTickA) meTickA = {};
  updateHeatTick(vpAHeat, meTickA, ME.color, frac, true, Boolean(roomA));

  if (!roomA) return;
  const now = performance.now();
  if (now - lastScrollSend < 350) return;
  lastScrollSend = now;
  const rects = getBlockRectsRelativeToScroll(vpAScroll);
  const markerPkt = encodeScrollMarker({ innerHeight: vpAScroll.clientHeight, blockRects: rects });
  if (peerBNarrow && markerPkt) {
    actA.move?.send(markerPkt);
  } else {
    actA.move?.send({ t: 'h', f: frac });
  }
}, { passive: true });

document.getElementById('vp-a-strike-text').addEventListener('click', e => {
  const w = e.target.closest('.wd');
  if (!w) return;
  const key = (heroAfter ? 'b' : 'a') + ':' + w.dataset.w;
  const on = !strikes[key];
  if (on) strikes[key] = ME.color;
  else delete strikes[key];
  renderWordStrikes();
  actA.strike?.send({ key, on, color: strikes[key] });
});

// Autonomous Bot Simulation Loop
setInterval(() => {
  if (!botsActive) return;
  const now = Date.now() / 1000;
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    if (!b.room?.active) continue;
    // Periodically pause movement so user can observe the 1.6s label fade!
    const cycle = (now + i * 3.5) % 9.0;
    if (cycle > 4.2) continue; // Stillness window (4.8s long) -> triggers 1.6s .moving removal!

    const k = (i + Math.floor(now / 9)) % 5;
    const fx = 0.18 + 0.64 * (0.5 + 0.5 * Math.sin(now * 1.1 + b.phase));
    const fy = 0.25 + 0.5 * (0.5 + 0.5 * Math.cos(now * 0.8 + b.phase));
    if (coordMode === 'page') {
      b.act.move.send({ x: fx, y: (k + fy) / 5, f: (k + fy) / 5, mode: 'page' });
    } else {
      b.act.move.send({ k, fx, fy });
    }
  }
}, 260);

// Toolbar Controls
document.getElementById('coord-mode').onchange = e => {
  coordMode = e.target.value;
};

document.getElementById('peer-b-mode').onchange = e => {
  peerBNarrow = e.target.value === 'narrow';
  vpBCard.classList.toggle('peer-b-narrow', peerBNarrow);
  document.getElementById('vp-b-subtitle').textContent = peerBNarrow
    ? 'Mobile / Coarse Pointer mode (renders .mark badges in right margin)'
    : 'Desktop Wide mode (renders SVG arrows + ghost drift comparator)';
};

document.getElementById('toggle-blocks').onclick = e => {
  const btn = e.currentTarget;
  const pressed = btn.getAttribute('aria-pressed') !== 'true';
  btn.setAttribute('aria-pressed', String(pressed));
  vpAScroll.classList.toggle('show-blocks', pressed);
  vpBScroll.classList.toggle('show-blocks', pressed);
};

document.getElementById('toggle-bots').onclick = e => {
  const btn = e.currentTarget;
  botsActive = !botsActive;
  btn.setAttribute('aria-pressed', String(botsActive));
  btn.textContent = botsActive ? 'bots: 3 active' : 'bots: paused (watch decay)';
};

rerollBtn.onclick = () => {
  ME = pickIdentity(seedCursor++);
  updateMeBadge();
  if (meTickA) updateHeatTick(vpAHeat, meTickA, ME.color, computeReadingFrac(vpAScroll.scrollTop, vpAScroll.clientHeight, vpAScroll.scrollHeight), true, Boolean(roomA));
  if (roomA) {
    for (const id of Object.keys(peersA)) {
      actA.hello?.send({ ...ME, strikes }, { target: id });
    }
    renderPresencePill();
  }
};

document.getElementById('spawn-late-peer').onclick = () => {
  const id = 'late-' + Math.random().toString(36).slice(2, 6);
  const ident = pickIdentity(seedCursor++);
  const lateRoom = mesh.joinRoom({ appId: '100toolkit-notes' }, 'deslop-model', id);
  const hello = lateRoom.makeAction('hello');
  const move = lateRoom.makeAction('move');
  const chathist = lateRoom.makeAction('chathist');
  lateRoom.onPeerJoin = targetId => {
    hello.send({ name: ident.name, color: ident.color }, { target: targetId });
  };
  chathist.onMessage = () => {};
  setTimeout(() => {
    move.send({ k: 2, fx: 0.45, fy: 0.5 });
  }, 80);
};

document.getElementById('sim-bot-chat').onclick = () => {
  const b = bots[0];
  if (!b?.room?.active) return;
  const msg = {
    id: 'bot-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: b.name,
    color: b.color,
    text: 'Quiet pointer check: name pills hide after 1.6s of stillness so we never block the prose.',
    ts: Date.now()
  };
  b.act.chat.send(msg);
};

document.getElementById('sim-burst-chat').onclick = () => {
  for (let i = 1; i <= 7; i++) {
    const blocked = chatRateLimiter.limited('me');
    if (blocked) {
      chatInput.placeholder = 'Slow down a little';
    } else {
      const m = {
        id: 'burst-' + i + '-' + Date.now().toString(36),
        name: ME.name,
        color: ME.color,
        text: `Burst test frame #${i} (6 allowed per 10s sliding window)`,
        ts: Date.now() + i
      };
      chatStore.add(m, true);
      actA.chat?.send(m);
    }
  }
  renderChatMessages();
  renderRateLimiterVisualizer();
};

// Tab 02: Interactive Decay Scrubber, Rate Limiter Visualizer, and Mesh Calculator
const decaySlider = document.getElementById('decay-slider');
const decayMsLabel = document.getElementById('decay-ms-label');
const decayDemoCur = document.getElementById('decay-demo-cur');

function updateDecayLab() {
  const ms = Number(decaySlider.value);
  decayMsLabel.textContent = `${ms} ms`;
  const state = evaluateCursorDecay(ms, 'cursor');
  decayDemoCur.style.opacity = String(state.cursorOpacity);
  decayDemoCur.classList.toggle('moving', state.movingClass);
  for (const seg of document.querySelectorAll('#decay-stages .decay-seg')) {
    seg.classList.toggle('active', seg.dataset.phase === state.phase);
  }
}
decaySlider.oninput = updateDecayLab;
updateDecayLab();

function renderRateLimiterVisualizer() {
  const status = chatRateLimiter.inspectPeer('me');
  const slots = document.querySelectorAll('#rate-slots .rate-slot');
  slots.forEach((slot, idx) => {
    slot.className = 'rate-slot';
    if (idx < status.count) {
      slot.classList.add(status.blocked ? 'blocked' : 'filled');
      slot.textContent = '●';
    } else {
      slot.textContent = String(idx + 1);
    }
  });
  const rateStatus = document.getElementById('rate-status');
  if (rateStatus) {
    rateStatus.textContent = status.blocked
      ? `RATE LIMITED (${status.count}/${status.max} in 10s) · next slot opens in ${(status.nextSlotInMs / 1000).toFixed(1)}s · input.placeholder = "Slow down a little"`
      : `Window usage: ${status.count} / ${status.max} messages in last 10.0s (${status.remaining} remaining)`;
  }
}
setInterval(renderRateLimiterVisualizer, 500);

document.getElementById('rate-fire-one').onclick = () => {
  chatRateLimiter.limited('me');
  renderRateLimiterVisualizer();
};
document.getElementById('rate-fire-seven').onclick = () => {
  for (let i = 0; i < 7; i++) chatRateLimiter.limited('me');
  renderRateLimiterVisualizer();
};
document.getElementById('rate-reset').onclick = () => {
  chatRateLimiter.reset();
  chatInput.placeholder = 'Say something';
  renderRateLimiterVisualizer();
};

const meshNSlider = document.getElementById('mesh-n-slider');
const meshNLabel = document.getElementById('mesh-n-label');
const meshCalcReadout = document.getElementById('mesh-calc-readout');

function updateMeshCalculator() {
  const n = Number(meshNSlider.value);
  meshNLabel.textContent = `${n} peers`;
  const totalLinks = (n * (n - 1)) / 2;
  const perPeerLinks = n - 1;
  // At 20 Hz (50ms throttle) and ~42 bytes per JSON move frame:
  const egressBytesPerSec = perPeerLinks * 20 * 42;
  const totalMeshMsgsPerSec = n * perPeerLinks * 20;
  const verdict = n <= 25
    ? 'Comfortable for serverless WebRTC mesh (low CPU & bandwidth).'
    : n <= 40
      ? 'Moderate fan-out load; mobile battery & NAT table limits begin to show.'
      : 'Above practical P2P full-mesh ceiling; an edge relay (PartyKit / Durable Object) is preferable here.';

  meshCalcReadout.innerHTML =
    `<div>Total <code>RTCPeerConnection</code> links: <strong>${totalLinks}</strong> (<code>${perPeerLinks}</code> per browser)</div>` +
    `<div>Active pointer egress per moving reader (20 Hz): <strong>${(egressBytesPerSec / 1024).toFixed(1)} KiB/s</strong></div>` +
    `<div>Aggregate mesh packets if all ${n} move simultaneously: <strong>${totalMeshMsgsPerSec.toLocaleString()} pkt/s</strong></div>` +
    `<div style="color:var(--accent); margin-top:4px">${verdict}</div>`;
}
meshNSlider.oninput = updateMeshCalculator;
updateMeshCalculator();

// Tab Switching
for (const btn of document.querySelectorAll('.tab-btn')) {
  btn.onclick = () => {
    const target = btn.dataset.tab;
    for (const b of document.querySelectorAll('.tab-btn')) {
      b.setAttribute('aria-selected', String(b === btn));
    }
    for (const panel of document.querySelectorAll('.tab-panel')) {
      panel.classList.toggle('active', panel.id === `panel-${target}`);
    }
  };
}

// Theme Toggle
const themeBtn = document.getElementById('theme-toggle');
themeBtn.onclick = () => {
  const isLight = document.documentElement.dataset.theme === 'light';
  if (isLight) {
    delete document.documentElement.dataset.theme;
    themeBtn.textContent = 'theme: dark';
  } else {
    document.documentElement.dataset.theme = 'light';
    themeBtn.textContent = 'theme: light';
  }
};

// Load or render embedded study markdown in Tab 03
async function loadStudyContent() {
  const target = document.getElementById('study-content');
  if (!target || target.children.length > 0) return;
  try {
    const res = await fetch('./analysis.md');
    if (res.ok) {
      const md = await res.text();
      target.innerHTML = `<pre style="white-space:pre-wrap">${md.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`;
    }
  } catch {
    target.textContent = 'Open dist/reader-presence.html for the self-contained study with pre-rendered analysis.';
  }
}
loadStudyContent();
