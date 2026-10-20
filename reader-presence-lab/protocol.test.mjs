import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
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

test('identity & hex color validation follow live.js and chat.js rules', () => {
  assert.equal(SLOPNAMES.length, 20);
  assert.equal(COLORS.length, 7);
  assert.equal(okColor('#2f6fdf'), '#2f6fdf');
  assert.equal(okColor('#2F6FDF'), '#2F6FDF');
  assert.equal(okColor('rgb(0,0,0)', '#999'), '#999');
  assert.equal(okColor('#123', '#999'), '#999');
  const id0 = pickIdentity(0);
  assert.equal(id0.name, 'tapestry');
  assert.equal(id0.color, '#d6452c');
});

test('page-fraction vs block-anchored [data-k] coordinate roundtrip and drift math', () => {
  const pkt = encodePageFraction({ pageX: 600, pageY: 1200, scrollY: 400, innerHeight: 1000, docW: 1200, docH: 2000 });
  assert.equal(pkt.x, 0.5);
  assert.equal(pkt.y, 0.6);
  // f = (400 + 1000*0.4) / 2000 = 800 / 2000 = 0.4
  assert.equal(pkt.f, 0.4);

  const decoded = decodePageFraction(pkt, { docW: 900, docH: 2000 });
  assert.equal(decoded.x, 450);
  assert.equal(decoded.y, 1200);
  assert.equal(decoded.f, 0.4);

  // Column drift when a 640px centered column is viewed on 1440px vs 760px viewports
  const drift = computeColumnDrift({ fxInColumn: 0.1, colW: 640, docWA: 1440, docWB: 760 });
  assert.ok(Math.abs(drift.driftPx) > 100, `Expected significant horizontal drift, got ${drift.driftPx}`);

  // Block-anchored [data-k] coordinates preserve exact point within block regardless of margin width
  const rectsA = [{ left: 400, top: 200, width: 640, height: 120, bottom: 320 }];
  const rectsB = [{ left: 60, top: 200, width: 640, height: 120, bottom: 320 }];
  const blockPkt = encodeBlockCoord({ clientX: 400 + 64, clientY: 200 + 30, blockIndex: 0, blockRect: rectsA[0] });
  assert.deepEqual(blockPkt, { k: 0, fx: 0.1, fy: 0.25 });

  const placeDesktop = decodeBlockCoord(blockPkt, { blockRects: rectsB, scrollX: 0, scrollY: 0, colRight: 700, innerWidth: 760, docH: 2000, isNarrow: false });
  assert.equal(placeDesktop.mode, 'cursor');
  assert.equal(placeDesktop.x, 60 + 64);
  assert.equal(placeDesktop.y, 200 + 30);

  // Coarse pointer / narrow viewport degrades to right-margin marker (.mark)
  const scrollPkt = encodeScrollMarker({ innerHeight: 600, blockRects: rectsB });
  assert.equal(scrollPkt.t, 's');
  assert.equal(scrollPkt.k, 0);
  const placeMobile = decodeBlockCoord(scrollPkt, { blockRects: rectsB, scrollX: 0, scrollY: 0, colRight: 700, innerWidth: 760, docH: 2000, isNarrow: true });
  assert.equal(placeMobile.mode, 'margin-mark');
  assert.equal(placeMobile.x, 760 - 24); // roomy is false since 760 - 700 = 60 <= 110
});

test('two-stage visual decay transitions at 1600ms and 9000ms (20000ms for margin marks)', () => {
  const s0 = evaluateCursorDecay(200, 'cursor');
  assert.equal(s0.phase, 'moving');
  assert.equal(s0.cursorOpacity, 0.55);
  assert.equal(s0.labelOpacity, 0.92);
  assert.equal(s0.movingClass, true);

  const s1 = evaluateCursorDecay(1600, 'cursor');
  assert.equal(s1.phase, 'quiet');
  assert.equal(s1.cursorOpacity, 0.55);
  assert.equal(s1.labelOpacity, 0);
  assert.equal(s1.movingClass, false);

  const s2 = evaluateCursorDecay(9000, 'cursor');
  assert.equal(s2.phase, 'dormant');
  assert.equal(s2.cursorOpacity, 0);

  const m1 = evaluateCursorDecay(15000, 'margin-mark');
  assert.equal(m1.phase, 'margin-active');
  const m2 = evaluateCursorDecay(20000, 'margin-mark');
  assert.equal(m2.phase, 'dormant');
});

test('chat sanitization, G-Set history deduplication, and 6-per-10s sliding-window rate limiter', () => {
  assert.equal(cleanChatMessage(null), null);
  assert.equal(cleanChatMessage({ id: 'x'.repeat(41), text: 'hi' }), null);
  assert.equal(cleanChatMessage({ id: 'ok', text: '   ' }), null);

  const cleaned = cleanChatMessage({
    id: 'msg-1',
    name: 'verylongreadername_exceeding_twenty_chars',
    color: 'not-a-color',
    text: '  hello world  ',
    ts: 1000
  });
  assert.equal(cleaned.name.length, 20);
  assert.equal(cleaned.color, '#999999');
  assert.equal(cleaned.text, 'hello world');

  const store = new ChatStore();
  assert.ok(store.add({ id: 'm2', name: 'delve', color: '#2f6fdf', text: 'second', ts: 200 }, false));
  assert.ok(store.add({ id: 'm1', name: 'tapestry', color: '#d6452c', text: 'first', ts: 100 }, true));
  // Duplicate id is ignored
  assert.equal(store.add({ id: 'm1', name: 'tapestry', color: '#d6452c', text: 'first-dup', ts: 100 }, false), null);
  // Sorted chronologically by ts
  assert.deepEqual(store.msgs.map(m => m.id), ['m1', 'm2']);

  // Merge overlapping history from two existing peers
  const addedFromA = store.mergeHistory([
    { id: 'm0', name: 'pivotal', color: '#1f9d6b', text: 'zero', ts: 50 },
    { id: 'm1', name: 'tapestry', color: '#d6452c', text: 'first', ts: 100 }
  ]);
  assert.equal(addedFromA, 1);
  assert.deepEqual(store.msgs.map(m => m.id), ['m0', 'm1', 'm2']);

  // Sliding window rate limiter: 6 messages allowed in 10,000ms, 7th blocked until window slides
  const limiter = new SlidingWindowRateLimiter({ windowMs: 10000, maxMessages: 6 });
  for (let i = 0; i < 6; i++) {
    assert.equal(limiter.limited('peer-a', 1000 + i * 500), false);
  }
  assert.equal(limiter.limited('peer-a', 4000), true);
  assert.equal(limiter.inspectPeer('peer-a', 4000).remaining, 0);
  // At t = 11001, the first message at t = 1000 expires
  assert.equal(limiter.limited('peer-a', 11001), false);
});

test('collaborative word-strike validation and VirtualTrysteroMesh peer gossip', () => {
  const strikes = {};
  assert.equal(applyStrikePacket(strikes, { key: 'a:12', on: true, color: '#d6452c' }), true);
  assert.equal(applyStrikePacket(strikes, { key: 'invalid-key', on: true, color: '#d6452c' }), false);
  assert.equal(strikes['a:12'], '#d6452c');
  assert.equal(applyStrikePacket(strikes, { key: 'a:12', on: false }), true);
  assert.equal(strikes['a:12'], undefined);

  assert.equal(mergeHelloStrikes(strikes, { 'b:3': '#1f9d6b', 'evil': '#000000' }), 1);
  assert.equal(strikes['b:3'], '#1f9d6b');

  // Synchronous (0ms latency) virtual mesh test
  const mesh = new VirtualTrysteroMesh({ latencyMs: 0, enableBroadcastChannel: false });
  const roomA = mesh.joinRoom({ appId: '100toolkit-notes' }, 'home', 'peer-A');
  const helloA = roomA.makeAction('hello');
  const histA = roomA.makeAction('chathist');

  const joinedAtA = [];
  roomA.onPeerJoin = id => {
    joinedAtA.push(id);
    helloA.send({ name: 'tapestry', color: '#d6452c' }, { target: id });
    histA.send([{ id: 'h1', name: 'tapestry', color: '#d6452c', text: 'welcome', ts: 123 }], { target: id });
  };

  let receivedHelloAtB = null;
  let receivedHistAtB = null;
  const roomB = mesh.joinRoom({ appId: '100toolkit-notes' }, 'home', 'peer-B');
  const helloB = roomB.makeAction('hello');
  const histB = roomB.makeAction('chathist');
  helloB.onMessage = (d, meta) => { receivedHelloAtB = { d, meta }; };
  histB.onMessage = (list) => { receivedHistAtB = list; };

  // Re-trigger targeted hello now that B's handlers are attached
  helloA.send({ name: 'tapestry', color: '#d6452c' }, { target: 'peer-B' });
  histA.send([{ id: 'h1', name: 'tapestry', color: '#d6452c', text: 'welcome', ts: 123 }], { target: 'peer-B' });

  assert.deepEqual(joinedAtA, ['peer-B']);
  assert.equal(receivedHelloAtB.d.name, 'tapestry');
  assert.equal(receivedHelloAtB.meta.peerId, 'peer-A');
  assert.equal(receivedHistAtB.length, 1);

  assert.throws(() => roomA.makeAction('label_way_too_long'), /exceeds 12 ASCII bytes/);
});

test('dist/reader-presence.html and root index.html bundle cleanly with zero external runtime assets', async () => {
  await import('./build.mjs');
  const html = readFileSync(new URL('./dist/reader-presence.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<script\b/gi) || []).length, 1, 'Expected exactly one <script> tag');
  assert.equal((html.match(/<\/script>/gi) || []).length, 1, 'Expected exactly one </script> tag');
  assert.equal(/<(?:script|link)[^>]+(?:src|href)=/i.test(html), false, 'Expected no external runtime script or stylesheet links');
  assert.ok(html.includes('id="vp-a-scroll"'), 'Expected primary reader viewport');
  assert.ok(html.includes('id="vp-b-scroll"'), 'Expected companion receiver viewport');
  assert.ok(html.includes('id="chatbox"'), 'Expected readers chat dialog');
  assert.ok(html.includes('03h2yz94n2z4ua7w8p2m75m04'), 'Expected embedded analysis with Engram note ID');

  const scriptBody = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new Script(scriptBody);

  const rootHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(rootHtml.includes('reader-presence-lab/dist/reader-presence.html'));
  assert.ok(rootHtml.includes('notes/reader-presence.html'));
});

