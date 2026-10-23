# Phase 1 architecture: instant delivery

Part of [plug-and-play.md](plug-and-play.md). Owners: Veilwarden (build output, headers, service worker, CI), Gatewright (boot order, lazy worlds, splash hand-off). Status: design, nothing built.

## Targets
| Moment | First visit, 4G phone | Repeat visit, any network (or none) |
|---|---|---|
| Something on screen | ≤ 0.4 s | ≤ 0.15 s |
| Live world, accepting input | ≤ 1.3 s | ≤ 0.5 s |
| Bytes over the network | ≤ 130 KB Brotli | ~0 (only a background update check) |

## The shape of it

```
                    ┌──────────────── first visit ────────────────┐
 tap link ─► Vercel edge (HTTP/2, Brotli)
              index.html  (no-cache, ~8 KB)  ── inline critical CSS + ASCII splash ──► first paint
                │  <link rel=preload> fires in parallel:
                ├─ three.<hash>.js     (immutable, slim r128, ~65 KB br)
                ├─ game.<hash>.js      (immutable, game + content, ~45 KB br)
                ├─ styles.<hash>.css   (immutable, ~3 KB br)
                └─ plexmono.<hash>.woff2 (immutable, ~12 KB)
              boot: build moat world only ─► compile shaders ─► first frame ─► splash fades
              idle: build Veyra, Neon Verge, Ashfall, spirit realm, one per idle slot
              after first frame: register sw.js ─► precache the same hashed files
                    └─────────────────────────────────────────────┘
                    ┌──────────────── repeat visit ───────────────┐
 tap link ─► sw.js answers index.html + every asset from Cache Storage (no network wait)
              boot as above ─► first frame
              in background: fetch index.html; if its hash list changed, precache the new files for next visit
                    └─────────────────────────────────────────────┘
```

Five pieces, each independent enough to land as its own PR, in this order:

## 1. Build output: hashed, merged, minified (`tools/build.py`)

**Files `dist/` will contain**
| File | Contents | Cache |
|---|---|---|
| `index.html` | markup, inline critical CSS, ASCII splash, preload tags | `no-cache` (always revalidated, ~8 KB) |
| `sw.js` | service worker, with the build's file list baked in | `no-cache` |
| `three.<hash>.js` | slim three.js r128 (see 2) | `max-age=31536000, immutable` |
| `game.<hash>.js` | `content` JSON + all systems in manifest order, minified | immutable |
| `styles.<hash>.css` | `game.css` minus what is inlined | immutable |
| `fonts/plexmono.<hash>.woff2` | subset font (see 3) | immutable |
| `manifest.webmanifest`, `healthz`, `vercel.json` | as today / Phase 4 | short |

- **Hash** = first 10 hex of SHA-256 of the file's final bytes. A file changes name only when its bytes change, so `three.*.js` keeps its name (and its place in every visitor's cache) across releases.
- **`content.js` folds into `game.js`** as `window.MM_CONTENT = …;` at the top. One less request; they always change together anyway.
- **Minify `game.js`** with esbuild (`--minify --target=es2019`, no bundling, it stays one IIFE). Expected 62 KB → ~45 KB Brotli.
- **Tooling rule:** esbuild is the only new dependency, pinned in a root `package.json` + `package-lock.json` (dev only, never shipped). `build.py` uses it when present and falls back to today's unminified output when it is not, printing a warning, so `python3 tools/build.py` still works on a bare machine. CI and the Docker build stage always have it (Docker build stage becomes `node:22-alpine` + `python3`, installing from the lockfile with `npm ci --ignore-scripts`).
- **Precompress** `*.br` and `*.gz` next to each asset for nginx (`gzip_static on`); Vercel compresses at its edge already.
- **Budget check** at the end of the build: sum of gzip sizes of first-load files must stay ≤ 160 KB (gzip stands in for Brotli because Python has no Brotli in the standard library; 160 KB gzip ≈ 130 KB Brotli). Over budget fails the build.

## 2. Slim three.js (`tools/slim_three.py`, run by hand, output committed)
- The game touches **46 THREE symbols** (Mesh, Group, the geometries, Lambert/Basic/Shader/Points/Sprite materials, lights, WebGLRenderer, WebGLRenderTarget, InstancedMesh, FogExp2, maths classes, a few constants). Loaders, animation, audio, post-processing, most materials and helpers are unused.
- `tools/slim_three.py` reads the `THREE.*` names straight out of `src/systems/**`, writes a tiny entry file `export { Mesh, Vector3, … } from 'three'`, and has esbuild bundle it from the pinned `three@0.128.0` npm package as an IIFE that assigns `window.THREE`. Game code does not change at all.
- Output is committed as `vendor/three.slim.min.js` with the symbol list in a header comment. The normal build never needs the network or npm for three.js.
- CI guard: the build greps `src/systems/**` for `THREE.X` and fails if any `X` is missing from the slim bundle's header list ("run tools/slim_three.py").
- Expected 121 KB → ~60 to 75 KB Brotli. r128's single-file module tree-shakes only partly, so a 30-minute spike measures the real number before we commit to it. If it saves under 30 KB, skip this piece; the service worker makes three.js free on repeat visits anyway.
- `THIRD_PARTY.md` notes the slim build is unmodified r128 source, tree-shaken.

## 3. No outside servers: self-hosted font
- Subset IBM Plex Mono (400 and 600 only, printable ASCII plus `▲▼◀▶◆ ✓ ×` and the box glyphs the HUD uses) with `fonttools pyftsubset` into one `woff2` per weight, ~10 to 12 KB each. Dev-time tool, output committed under `vendor/fonts/`.
- `@font-face { font-display: swap }` and `<link rel="preload" as="font" crossorigin>` for the 400 weight only. The canvas ASCII pass does not use this font, so the world never waits for it.
- CSP in `deploy/headers.json` tightens: `style-src 'self' 'unsafe-inline'`, `font-src 'self'`. Both Google origins disappear. `THIRD_PARTY.md` updated (font now bundled, OFL text added).

## 4. Instant first paint and the hand-off (`src/index.html`, `core/00-bootstrap.js`, `core/53-loop.js`)
**`index.html` head order**
1. `<meta viewport>`, `<title>`, Open Graph tags (Phase 4).
2. `<style>` with critical CSS only: background colour, `#splash` styles, `#stage` sizing (~1 KB; `'unsafe-inline'` styles are already allowed by our CSP, inline *scripts* stay forbidden).
3. `<link rel="preload">` for `three`, `game`, the font; `fetchpriority="high"` on the two scripts.
4. `<link rel="stylesheet" href="styles.<hash>.css">`.

**Body**
- `<pre id="splash" aria-hidden="true">`: a real frame of the moat (castle, lake, moon) captured once from the ASCII pass at ~100 columns and committed as `src/splash.txt`. The build injects it. Pure text, ~4 KB before compression, ~1 KB after. It scales with `font-size: min(1.6vw, 1.1vh)` so it fills any screen.
- Game markup as today, all HUD hidden until the `live` class lands.
- `<script defer src="three.<hash>.js">`, `<script defer src="game.<hash>.js">` at the end. `defer` keeps order and never blocks parsing.

**Hand-off**
- After the first real frame is drawn, `53-loop.js` adds `body.live`. CSS cross-fades the splash out (250 ms) and the canvas and HUD in. No progress bar, no text, nothing to click.
- `performance.mark('mm:paint' | 'mm:scripts' | 'mm:world' | 'mm:frame')` at each step, so the smoke test and anyone in DevTools can read the timeline.
- Errors (no WebGL, script failed) replace the splash with the existing `#err` message, so the player never stares at a frozen picture.

## 5. Build only what you can see (`core/00-bootstrap.js` + world systems)
Today every system runs top to bottom on load, building all five worlds before the first frame. That is most of the ~155 ms on a Mac and most of the ~0.6 to 0.9 s on a phone.

**Contract**
- `core/00-bootstrap.js` gains a tiny boot queue:
  - `later(name, fn)` registers deferred work.
  - `ensure(name)` runs it immediately if it has not run yet (idempotent).
  - An idle pump runs one queued job per `requestIdleCallback` slot (falls back to `setTimeout(…, 16)` on Safari), starting after the first frame.
- World systems for Veyra (`39`), Neon Verge (`40`), Ashfall (`41`) and the spirit realm (`37`, `37b`) wrap their scene construction in `later('veyra', () => …)` and so on. Their *functions and state* still define at load, so nothing that references them breaks; only the meshes are deferred.
- Every path into a world calls `ensure(world)` first: the World Gate (`44-world-select.js`), story travel and rift storms (`43`, `45`), `Q` for the spirit realm (`37`), and Phase 4 deep links. If the idle pump already built it (normal case, all done within ~2 s), `ensure` is a no-op.
- **Shaders:** once a world is built, call `renderer.compile(scene, camera)` with that world's group visible for one call, so its first appearance never hitches. The moat compiles behind the splash before the first frame.
- Each world file needs a short audit to split "define" from "build". This is the riskiest piece of Phase 1 and lands last, with a play-through of every gate, storm and realm switch.

## 6. Service worker: offline-first (`src/sw.js`, registered from `53-loop.js`)
- **Registered after the first frame** (`navigator.serviceWorker.register('/sw.js')`), so it never competes with the first load for bandwidth. External file, so CSP needs no change (`worker-src` falls back to `script-src 'self'`).
- **Install:** precache `index.html` and every hashed file. The build writes the list and a version (hash of the list) into `sw.js`.
- **Fetch:**
  - Hashed assets: cache first, forever (their names change when their bytes do).
  - `index.html` (navigations): **stale-while-revalidate**. Answer from cache instantly, fetch the fresh one in the background, and if its version differs, precache the new files so the *next* visit is the new release. A player is never interrupted mid-run by an update.
  - Anything else (healthz, unknown paths): network only.
- **Activate:** delete caches from versions older than the previous one (keep one old version so a tab still running it never loses files).
- **Kill switch:** if a release goes wrong, shipping a `sw.js` that unregisters itself and clears caches recovers every device on its next visit. Documented in `docs/hosting.md`.
- Private windows and in-app browsers that block service workers simply fall back to the HTTP cache below; nothing breaks.

## 7. Headers: one cache policy, two servers
- New `deploy/cache.json` is the single source for cache rules, beside `deploy/headers.json` for security:
  ```json
  { "immutable": ["/*.*.js", "/*.*.css", "/fonts/*"], "revalidate": ["/", "/index.html", "/sw.js", "/manifest.webmanifest"] }
  ```
- `build.py` turns it into per-path `headers` entries in `dist/vercel.json`; `tools/nginx_headers.py` turns it into `location` blocks for the container. Same behaviour on Vercel, Docker, Helm and plain Kubernetes.
- `sw.js` also gets `Service-Worker-Allowed: /` and `no-cache`, so browsers pick up a new worker within one visit.

## Expected first-visit timeline, 4G phone (≈ 70 ms RTT, ≈ 5 Mbps)
| t | What happens |
|---|---|
| 0 to 250 ms | DNS, TLS 1.3, HTTP/2 to the Vercel edge |
| ~330 ms | `index.html` arrives; **splash on screen** |
| ~330 to 550 ms | three, game, CSS and font download in parallel (~125 KB) |
| ~550 to 1,150 ms | parse, build the moat only, compile shaders |
| **~1.2 s** | **first frame; splash fades; first input moves the hero** |
| 1.2 to ~3 s | other worlds build in idle slots; service worker installs |

Repeat visit: no network on the critical path; ~0.3 to 0.5 s to the first frame, mostly the moat build (also faster on repeat thanks to the browser's code cache).

These are estimates from today's measurements. The smoke test in Phase 5 records the real `mm:*` marks at phone, tablet and desktop sizes, and Lighthouse mobile checks them on every PR.

## What does not change
- Security posture: CSP only gets *stricter* (two Google origins removed, nothing added). No inline scripts, no outside calls, no framing.
- Game code outside boot, loop and the five world files.
- `python3 tools/build.py` remains the one build command; Docker, Helm and Vercel deploy steps stay the same.

## PR order
1. Self-hosted font + CSP tightening (smallest, removes two servers).
2. Hashed filenames, merged content, `deploy/cache.json`, headers for Vercel and nginx, precompression, size budget.
3. esbuild minify + slim three.js spike (keep only if it saves ≥ 30 KB).
4. Inline critical CSS, ASCII splash, `body.live` hand-off, performance marks.
5. Service worker.
6. Lazy world building + shader precompile (last; needs a full play-through).

## Results so far
Measured with `python3 tools/measure.py` (slow-4G model: 150 ms RTT, 1.6 Mbps; Brotli sizes).

| | Before (`5c6d72e`) | After PR 1 + 2 |
|---|---|---|
| Servers to connect to | 3 (self, fonts.googleapis.com, fonts.gstatic.com) | **1** |
| Requests on first load | 8 | **6** |
| Bytes on the wire, first load | 212 KB | 212 KB (unchanged until PR 3) |
| First paint (model) | 1.22 s | **0.79 s** |
| Scripts ready (model) | 2.29 s | **1.83 s** |
| Repeat visit: requests | 5 revalidations | **1** (only `index.html`) |
| Repeat visit: network wait (model) | 0.75 s | **0.60 s** (0 once PR 5's service worker lands) |

- PR 1: IBM Plex Mono 400 and 600 bundled from `vendor/fonts/` (the same Latin subsets Google served; weight 500 was never used and is dropped). CSP now `style-src 'self' 'unsafe-inline'; font-src 'self'`; both Google origins gone.
- PR 2: everything but `index.html` lives in `dist/a/` with content hashes and `immutable` caching (`deploy/cache.json`, written to Vercel and nginx). `content.js` folded into `game.js`. `.gz` files beside text assets for nginx `gzip_static`. Build fails over `BUDGET_KB` (260 KB gzip now; 160 KB after PR 3).
