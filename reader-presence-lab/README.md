# Reader Presence Lab

An interactive multi-user presence, quiet-cursor, and peer-gossiped chat study dissecting [100toolkit.com](https://100toolkit.com/) (`100toolkit.com/live.js`, `100toolkit.com/blog/chat.js`, `100toolkit.com/note.js`, and the `/blog/*` essays). Original implementation; no affiliation with Erik Markus Kannike / 100x Ventures OÜ. Read [analysis.md](analysis.md) for the source dissection and architectural tradeoffs.

## Run

```sh
node reader-presence-lab/build.mjs        # → reader-presence-lab/dist/reader-presence.html (opens directly from disk)
node --test reader-presence-lab/protocol.test.mjs
```

Open `reader-presence-lab/dist/reader-presence.html` directly from disk (`file://`) or open two browser tabs side-by-side to test live cross-tab `BroadcastChannel` synchronization.

## What to Explore

1. **01 · Dual-Viewport Live Stage**:
   - **Viewport A · Primary Reader ("You")**: Move your pointer to see your trailing `.lv-tag` (`<name> · you`), watch autonomous simulated readers (`delve`, `pivotal`) and any other open browser tabs traverse `[data-k]` blocks, pause to read (shedding their name badge after `1.6s` and fading out after `9.0s`), double-click any block to trigger an expanding `.ping` ring, click words in the **AI Slop Excerpt** to toggle shared colored strikethroughs (`act.strike`), scroll to move ticks along the right-edge `#heat` reading-position strip, and toggle the bottom `#pill` (`hide` / `show`) to test WebRTC IP-privacy disconnect.
   - **Viewport B · Companion Receiver Mirror & Drift Comparator**: Compare **Blog `[data-k]` Block-Anchored mode** against **Landing Page-Fraction (`x/docW`) mode** with a live ghost cursor showing horizontal pixel drift across different viewport widths, or switch Peer B to **Mobile / Coarse Pointer mode** to see pointers degrade into quiet right-margin `.mark` badges.
   - **Readers' Chat (`#chatbtn`, `#chatbox`, `#chattoast`) & Late-Joiner Gossip (`+ late joiner`)**: Open the bottom-right chat pill to send messages, trigger the 5-second toast preview when collapsed, click **+ late joiner** to watch existing peers gossip their last 30 messages (`chathist`) and `strikes` map to the newcomer, or burst 7 messages in 10 seconds to trip the sliding-window rate limiter (`"Slow down a little"`).
2. **02 · Wire Protocol, Decay & Rate Limiter**:
   - Scrub the **Two-Stage Visual Decay Timeline (`0–10.5s`)**, test the **6-message / 10,000ms Sliding-Window Rate Limiter**, and explore the **WebRTC Full-Mesh Scaling Calculator (`N(N-1)/2`)**.
3. **03 · Source Dissection & Tradeoffs**:
   - Complete embedded engineering study (`analysis.md`) comparing Trystero/Nostr WebRTC DataChannels against stateful edge servers (PartyKit / Cloudflare Durable Objects) and local multi-tab buses.

## Source & Provenance

- `protocol.mjs`: Pure protocol module implementing `SLOPNAMES` identity picking, page-fraction vs. `[data-k]` block-anchored coordinate normalization, horizontal viewport drift math, 2-stage cursor decay, `ChatStore` G-Set history deduplication, `SlidingWindowRateLimiter`, word-strike merging, and `VirtualTrysteroMesh` (`BroadcastChannel` + in-page virtual rooms).
- `protocol.test.mjs`: Automated `node:test` suite verifying all protocol invariants.
- `app.js`, `index.html`, `style.css`: Interactive 3-tab workbench and dual-viewport simulator.
- `build.mjs`: Bundles everything into `dist/reader-presence.html` (and `dist/artifact.html`) with `node:vm` syntax checking and zero-external-asset verification.
- `analysis.md`: Evidence-based source dissection. Engram note: `03h2yz94n2z4ua7w8p2m75m04`.

All code, styles, SVG cursors, and test harnesses are original. `dist/` is ignored by `.gitignore`.
