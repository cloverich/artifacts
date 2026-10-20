# 100toolkit.com: Serverless WebRTC Reader Presence, Quiet Cursors, and Gossiped Chat

Research and source dissection of **[100toolkit.com](https://100toolkit.com/)** (Erik Markus Kannike / 100x Ventures OÜ) and its companion essays (`/blog/where-ai-slop-comes-from/`, `/blog/slop-neurons/`, `/blog/deslop-model/`), inspected on **19 October 2026**. Engram note: `03h2yz94n2z4ua7w8p2m75m04`.

Although multi-user live cursors and in-page chat typically imply a dedicated stateful backend (WebSocket fan-out, PartyKit, Liveblocks, or Supabase Realtime), `100toolkit.com` runs **entirely on static hosting (Netlify) with zero custom backend server for presence or chat**. Instead, the React landing bundle (`/assets/index-DXYvOWSf.js`) and the static blog essays inject three small, unminified vanilla JavaScript modules at runtime:

- `https://100toolkit.com/live.js` (103 lines) — landing-page WebRTC room (`"home"`), quiet named pointers, right-edge reading-position strip (`#heat`), self-perception pointer tag (`.lv-tag`), and bottom presence pill (`#pill`).
- `https://100toolkit.com/blog/chat.js` (126 lines) — ephemeral readers' chat (`#chatbtn`, `#chatbox`, `#chattoast`), sliding-window per-peer rate limiter, and peer-to-peer history catch-up (`chathist`).
- Inline `<script type="module">` on `/blog/*` essays (~138 lines) — upgrades cursor positioning from whole-page fractions to semantic block-anchored coordinates (`[data-k]`), adds mobile right-margin scroll markers (`.mark`), double-click ripple pings (`.ping`), and collaborative word-strike state (`strike`).
- `https://100toolkit.com/note.js` (54 lines) — private 1-to-1 author contact modal backed by static Netlify Forms (`POST /blog/`), completely separate from the peer-to-peer reader mesh.

---

## 1. Observed Behavior vs. Inspected Implementation

### Observed Experience
1. **Assigned "AI Slop" Identity (`ME`)**: Every page load picks a single-word handle from 20 overused LLM vocabulary words (`tapestry`, `delve`, `pivotal`, `seamless`, `robust`, `landscape`, `synergy`, `paradigm`, `testament`, `leverage`, `holistic`, `vibrant`, `myriad`, `beacon`, `nuanced`, `catalyst`, `bustling`, `unlock`, `elevate`, `realm`) and one of 7 editorial palette colors (`#d6452c`, `#2f6fdf`, `#1f9d6b`, `#8a5cd6`, `#c27a12`, `#c2417f`, `#16879a`).
2. **Self-Perception Mirror (`.lv-tag` / `.selftag`)**: On desktop (`pointerType === "mouse"`), a tiny monospace badge (`tapestry · you`) trails your own pointer at `(clientX + 14px, clientY + 16px)` with `0.75` opacity so you see yourself the way other readers see you.
3. **Quiet Remote Pointers (`.lv-cur` / `.cur`)**: Remote cursors render at a subdued `0.55` opacity. Their name pill (`opacity: 0.92`) is shown **only while moving** (`.moving` class). After `1600ms` of stillness, the name pill fades out, leaving only the `10×13` SVG pointer; after `9000ms` of stillness, the pointer itself fades to `opacity: 0`.
4. **Right-Edge Reading Strip (`#heat`)**: A fixed `6px`-wide vertical gutter along the right viewport edge renders one `4px × 12px` tick per reader (`6px` wide for `.me`) at `(scrollY + innerHeight * 0.4) / scrollHeight * 100%`.
5. **Bottom Presence Pill (`#pill`) & IP-Privacy Opt-Out**: A centered bottom pill displays your chip (`pchip pme`), up to 4 peer chips, an overflow counter (`+N`), and a `hide` / `show` toggle. On the blog essays, the `hide` button carries a tooltip disclosing WebRTC's peer-to-peer IP trade-off: *"Live cursors use peer-to-peer connections, which show your IP address to other readers."*
6. **Ephemeral Readers' Chat (`#chatbtn`, `#chatbox`, `#chattoast`)**: A bottom-right `chat` button opens a `320×380px` panel (`"only people reading now see this · nothing is saved"`). When closed, incoming messages increment an unread counter (`9+` cap) and slide up a 2-line toast preview (`#chattoast`) for `5000ms`. Late-joining readers still receive recent chat messages from existing peers in the room.

---

## 2. Architecture & Protocol Dissection

### 2.1 Transport: Trystero + Public Nostr Signaling + WebRTC DataChannels
In `live.js` (line 74) and the `/blog/*` inline scripts:
```js
const {joinRoom} = await import("https://esm.run/trystero@0.26.0");
room = joinRoom({appId: "100toolkit-notes"}, "home"); // or "deslop-model", "slop-neurons"
```
- **Signaling Plane (Nostr Relays)**: Importing the root `trystero@0.26.0` package selects Trystero's default **Nostr strategy**. Each browser opens WebSockets to a built-in pool of public Nostr relays, hashes `(appId, roomId)` into a deterministic topic filter, and exchanges ephemeral encrypted WebRTC SDP offers/answers and ICE candidates.
- **Data Plane (`RTCDataChannel`)**: Once ICE negotiation completes between two readers, all presence, pointer, ping, strike, and chat packets travel **directly peer-to-peer over WebRTC DataChannels**. No backend server relays or stores application state.
- **Action Multiplexing**: Trystero's `room.makeAction(label)` creates a named sub-channel (constrained to $\le 12$ ASCII bytes):

| Action Label | Payload Schema | Direction | Trigger / Throttle | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `hello` | `{name, color, strikes?}` | Targeted (`{target: id}`) | On `room.onPeerJoin(id)` | Announces local identity (and current word-strike map on blog essays) to a newly joined peer. |
| `move` (landing) | `{x, y, f}` or `{f}` | Broadcast | `pointermove` (`60ms`) / `scroll` (`700ms`) | Whole-document fractions `x = pageX / docW()`, `y = pageY / docH()`, and reading fraction `f`. |
| `move` (blog) | `{k, fx, fy, t?}` or `{t: "h", f}` | Broadcast | `pointermove` (`50ms`), `scroll` (`300ms` / `700ms`) | Block-relative coordinates inside `[data-k]` element index `k`, scroll-margin marker (`t: "s"`), or heat-strip update (`t: "h"`). |
| `ping` (blog) | `{k, fx, fy}` | Broadcast | `dblclick` inside `[data-k]` | Spawns a `12×12px` expanding border ring (`.ping`, `scale(0.5) -> scale(5)` over `1s`). |
| `strike` (blog) | `{key, on, color}` | Broadcast | `click` on `.wd` word span | Toggles collaborative strikethrough (`"a:14"`, `"b:7"`) in the AI-slop before/after text comparison. |
| `chat` | `{id, name, color, text, ts}` | Broadcast | Form submit (`<= 6` msgs / `10s`) | Sends a live chat message (`<= 280` chars) to all connected peers. |
| `chathist` | `Array<{id, name, color, text, ts}>` | Targeted (`{target: id}`) | On `room.onPeerJoin(id)` | Gossip catch-up: each existing peer sends its last 30 messages to the newly joined peer. |

---

### 2.2 Coordinate Mapping: Whole-Document Fractions vs. Block-Anchored `[data-k]`
Comparing `100toolkit.com/live.js` (landing page) with `100toolkit.com/blog/*/index.html` (essays) exposes a classic responsive-layout problem in shared cursor systems and its clean solution:

1. **Whole-Document Fractions (`live.js`)**:
   - Encodes `x = e.pageX / docW()` and `y = e.pageY / docH()`.
   - Reconstructs via `translate(${m.x * docW()}px, ${m.y * docH()}px)`.
   - **Tradeoff**: Zero DOM lookup cost, *but* when a centered column (`max-w-4xl mx-auto`) sits inside a `1440px` monitor vs. an `820px` window, the outer margins shrink while the column width remains fixed. A fraction `x = 0.35` drifts horizontally by 100+ pixels across different aspect ratios.
2. **Semantic Block-Anchored Coordinates (`/blog/*` essays)**:
   - Every paragraph, heading, figure, and interactive box carries a `data-k` attribute (`const blocks = () => [...document.querySelectorAll("[data-k]")]`).
   - `where(e)` locates `const b = e.target.closest?.("[data-k]")` and normalizes `(fx, fy)` **relative to that specific element's bounding box**:
     $$k = \text{blocks().indexOf}(b), \quad f_x = \frac{\text{clientX} - r.\text{left}}{r.\text{width}}, \quad f_y = \frac{\text{clientY} - r.\text{top}}{r.\text{height}}$$
   - On the receiving peer, `place(id, m)` queries `blocks()[m.k].getBoundingClientRect()` and projects `(fx, fy)` into that block's local coordinates:
     $$x = r.\text{left} + \text{scrollX} + f_x \cdot r.\text{width}, \quad y = r.\text{top} + \text{scrollY} + f_y \cdot r.\text{height}$$
   - Because both peers anchor to paragraph index `k`, cursors land on the same clause even when viewport widths, margins, or line wraps differ.
3. **Coarse-Pointer / Narrow-Viewport Margin Degradation (`t === "s"`)**:
   - On phones and tablets (`narrow = matchMedia("(max-width: 760px), (pointer: coarse)")`), readers scroll rather than hover, and floating cursors over narrow text are distracting.
   - Scroll events (`300ms` throttle) find the `[data-k]` block intersecting `yMid = innerHeight * 0.4` and broadcast `{k, fx: 1, fy: (yMid - r.top) / r.height, t: "s"}`.
   - When `m.t === "s"` or `narrow.matches` is true, `place()` hides the SVG arrow and places a quiet initial badge (`.mark`) in the **right margin outside the prose column** (`x = roomy ? col.right + 18 : innerWidth - 24`), fading after `20,000ms`.

---

### 2.3 Motion Interpolation & Two-Stage Visual Decay
Rather than running a `requestAnimationFrame` spring loop, `100toolkit.com` relies on CSS compositor transitions and two per-peer `setTimeout` handles (`p.lt` and `p.t`):
- **Piecewise Linear CSS Interpolation**: `.lv-cur { transition: transform .2s linear, opacity .6s }` (and `.14s linear` on the blog) turns `50–60ms` network samples (`16.7–20 Hz`) into smooth linear motion without JS per-frame overhead.
- **Stage 1 — Label Decay (`1600ms`)**: Each incoming `move` packet adds `.moving` (`span { opacity: .92 }`) and resets `p.lt = setTimeout(() => el.classList.remove("moving"), 1600)`. Moving cursors identify their owner; stationary cursors shed their text badge after `1.6s`.
- **Stage 2 — Cursor Decay (`9000ms` / `20000ms`)**: Each packet resets `p.t = setTimeout(() => el.style.opacity = 0, 9000)` (`20000ms` for `.mark` margin badges). Idle cursors disappear from the canvas while remaining visible in `#pill` and `#heat`.

---

### 2.4 Serverless Ephemeral Chat & Peer-Gossiped State (`chat.js`)
`chat.js` implements a self-healing multi-user chat widget over WebRTC without any database:
1. **Gossip History Catch-Up (`chathist`)**:
   - When peer $P_{\text{new}}$ connects, `room.onPeerJoin(id)` calls `Chat.peerJoin(id)`, which sends `msgs.slice(-30)` targeted to $P_{\text{new}}$ via `histAct.send(..., {target: id})`.
   - Every existing peer in the room sends its last 30 messages to $P_{\text{new}}$.
   - `add(m, false)` deduplicates via `seen = new Set()` keyed by `m.id`, sorts chronologically (`msgs.sort((a, b) => a.ts - b.ts)`), and caps the log at 60 entries (`msgs.slice(-60)`). This forms a bounded **grow-only set (G-Set) CRDT** over immutable message records.
2. **Collaborative Word Strikes (`window.APP.strikes`)**:
   - On `/blog/where-ai-slop-comes-from/`, clicking any word `.wd` toggles `strikes["a:14"] = ME.color` and broadcasts `act.strike.send({key, on, color})`.
   - On `room.onPeerJoin(id)`, existing peers include their `strikes` dictionary inside `act.hello.send({...ME, strikes: window.APP.strikes}, {target: id})`, so latecomers immediately see existing word cuts.
3. **Sliding-Window Per-Peer Rate Limiter**:
   - `limited(peer)` filters `rate[peer]` to timestamps within `now - t < 10000` and blocks once `r.length >= 6` (6 messages per 10 seconds), protecting both the local sender (`input.placeholder = "Slow down a little"`) and each incoming remote `peerId`.
4. **Defensive Sanitization (`clean(m)`)**:
   - Validates `typeof m.id === "string" && m.id.length <= 40`, slices `name` to 20 chars, clamps `text.trim()` to 280 chars, checks hex color `/^#[0-9a-f]{6}$/i`, and constructs DOM nodes strictly with `.textContent` and `document.createTextNode()`.

---

## 3. Architectural Tradeoffs & Alternatives

| Dimension | P2P WebRTC Mesh (Trystero + Nostr) — *100toolkit.com* | Edge Room Server (PartyKit / Cloudflare Durable Objects) | Local Multi-Tab Bus (`BroadcastChannel` + Virtual Mesh) |
| :--- | :--- | :--- | :--- |
| **Server Cost & Ops** | **Zero** — static HTML/JS; public Nostr relays handle SDP signaling | Low but nonzero; requires deployed worker/account | **Zero** — works offline and directly from `file://` |
| **Connection Topology** | Full mesh: $\frac{N(N-1)}{2}$ peer connections; each client sends $N-1$ copies | Star topology: 1 WebSocket per client; edge room fans out | Local browser broadcast bus + in-page virtual mesh |
| **Concurrency Ceiling** | Practical for **2–30 concurrent readers**; degrades above ~40–50 peers | Scales to **100s–1,000s of peers** per room with server aggregation | Unlimited simulated peers + open browser tabs on one machine |
| **IP Privacy** | **Peers see each other's IP addresses** in ICE candidates (requires `hide` opt-out) | **Hidden** — peers only connect to the edge server's IP | Fully local to the user's device |
| **NAT / Firewall Traversal** | ~85–90% direct STUN success; symmetric NATs fail without TURN relay | ~99.9% success over standard HTTPS port 443 WebSockets | 100% local |
| **Persistence / Late Join** | Ephemeral only; vanishes when the last peer closes the tab (`chathist` gossip while $\ge 1$ peer remains) | Optional Durable Storage / SQLite snapshot when room empties | Ephemeral across open tabs |

---

## 4. Local Artifact Differences & Verification

Because a self-contained artifact in this collection must open directly from disk (`file://`) without external runtime dependencies or network connections to public Nostr relays, **`reader-presence-lab`** replaces the remote `import("https://esm.run/trystero@0.26.0")` call with an inlined **`VirtualTrysteroMesh`** (`protocol.mjs`):
- Preserves the exact `joinRoom({appId}, roomName)`, `room.makeAction(label)` ($\le 12$-byte check), `hello`, `move`, `ping`, `strike`, `chat`, and `chathist` wire schemas from `100toolkit.com`.
- Bridges across real browser tabs/windows via `BroadcastChannel("100toolkit-presence-lab")` so opening two local windows of `dist/reader-presence.html` syncs cursors, scroll ticks, word strikes, pings, and chat live.
- Pairs a **Primary Reader Viewport ("You")** with a **Companion Peer Viewport ("Peer B")** inside the same page so you can compare **Landing Page-Fraction mode** vs. **Blog Block-Anchored `[data-k]` mode**, inspect cross-viewport horizontal drift vectors, switch Peer B between **Desktop Pointer** and **Mobile Right-Margin `.mark` mode**, trigger late-joiner `chathist` + `strikes` gossip handshakes, and inspect every frame and rate-limiter window in real time.
