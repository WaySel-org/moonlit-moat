# Plug and play: click the link, you're playing

Owner: Gatewright (boot, HUD, input), Veilwarden (delivery, CI). Status: plan, nothing built yet.

## Goal
Someone taps `play.waysel.com` on a phone, tablet or laptop. The world is on screen almost at once, live and moving. The first touch or key is already playing. No menus, no loading screen, no open panels, no wall of controls, no pause card they did not ask for.

**Done means**
- Repeat visit: world on screen in under 0.5 s, with no network wait at all (served from the device).
- First visit on 4G: something on screen in under 0.3 s, live world in under 1.5 s. On broadband, under 0.7 s.
- Zero clicks to see the world; the first input controls the hero.
- Nothing modal or panel-like is open on first load.
- Phone (portrait and landscape), tablet and desktop each get controls built for them, including in-app browsers (Slack, iMessage, X, LinkedIn, WhatsApp).
- CI fails if the game loads with console errors, paused, with a blank canvas, or over the size budget.

## Does it need a loading time? (measured 2026-10-23)

**Short answer:** not a loading *screen*. There is about 1 s of unavoidable work on a first visit over 4G. We hide it behind an instant ASCII scene drawn in plain HTML/CSS, and make every repeat visit load from the device with no network wait.

| What has to arrive | Raw | Brotli (what the phone downloads) |
|---|---|---|
| `vendor/three.min.js` | 603 KB | 121 KB |
| `game.js` | 272 KB | 62 KB |
| `index.html` + `styles.css` + `content.js` | 42 KB | 11 KB |
| **Total** | **917 KB** | **≈ 194 KB** |

- **Download:** about 194 KB. On good 4G that is about 0.3 to 0.6 s after the connection opens; on weak 4G, 1 to 2 s.
- **Start-up work:** building the world takes about 155 ms on this Mac. A mid-range phone is 4 to 6 times slower: about 0.6 to 0.9 s, plus shader compile on the first frame.
- **Things slowing it down today (checked on the live site):**
  1. **Google Fonts.** `index.html` loads IBM Plex Mono from `fonts.googleapis.com` and `fonts.gstatic.com`: two extra servers to look up and connect to, and a stylesheet that blocks the first paint. It also breaks the "no outside network calls" rule in `AGENTS.md`.
  2. **No long-term caching.** play.waysel.com answers every file with `cache-control: max-age=0, must-revalidate`, so a returning phone asks the server again for every file before it can start.
  3. **All of three.js ships**, though the game uses only part of it.
  4. **Everything is built before the first frame**, including worlds you are not in (Veyra, Neon Verge, Ashfall, spirit realm).
- Already good: Brotli is on, and Vercel served from a nearby edge (Singapore) as a cache HIT.

## What gets in the way today
1. **It can open paused.** `core/49-pause.js` pauses on `window` blur and `visibilitychange`, so a link opened from another app or a background tab lands on the Paused card. Seen in the local build.
2. **The Renderer panel is open by default** (`<details id="panel" open>` in `src/index.html`): view, palette, cell size, exposure and two long how-to essays.
3. **Top-left wall of text:** title, 17 keybinds in one line, plus the objective.
4. **Everything shows at once:** hero sheet, camp clock, skills bar, soul coil, minimap, pause button.
5. **Touch controls are a desktop afterthought:** a 4-button digital d-pad (no diagonals, no walk speed) and a grid of 13 equal buttons. Tablets get the same small phone layout. Camera turning is a drag anywhere, which fights with the buttons.
6. **Cell size is fixed at 4 px.** Dense on a big monitor, mush on a phone.
7. **Link previews are bare,** and there is no resume.

## Plan

### Phase 1: Instant delivery (Veilwarden + Gatewright)
Full architecture: [instant-delivery.md](instant-delivery.md).
1. **Drop Google Fonts.** Self-host a subset of IBM Plex Mono as one ~15 KB `woff2` with `font-display: swap`, or use the system monospace stack. One server, no blocking stylesheet, rule respected.
2. **Content-hashed filenames + immutable caching.** The build writes `game.3f9a1c.js` and so on. Those files get `cache-control: public, max-age=31536000, immutable`; only `index.html` revalidates. A returning player downloads only a tiny HTML file, or nothing.
3. **Service worker, offline-first.** Precache the hashed files on first visit. From then on the game starts from the device even on a train with no signal, and new versions download quietly in the background for next time.
4. **Trim three.js.** Bundle only the parts the game uses (tree-shaken build with esbuild in `tools/build.py`). Expected 121 KB down to about 60 to 80 KB. Minify `game.js` too (62 KB down to about 45 KB). Target total: **under 130 KB** Brotli.
5. **Priority hints:** `<link rel="modulepreload">` / `preload` for the two scripts, `fetchpriority="high"`, scripts `defer`, so download overlaps with HTML parsing.
6. **Instant first paint, no loader.** `index.html` ships a static ASCII skyline of the moat (pure HTML/CSS, a few KB, no inline script, CSP unchanged). It is on screen in the first ~100 ms, and the live 3D scene fades in over it the moment it is ready. It reads as the world waking up, not a loading screen.
7. **Build only what you can see.** Build the moat world first and start the loop; build the other worlds and the spirit realm during idle frames afterwards (`requestIdleCallback`), before anyone can reach them. Precompile shaders (`renderer.compile`) behind the ASCII skyline.

### Phase 2: Open straight into a playing world (Gatewright)
8. **Never start paused.** Arm the blur/visibility auto-pause only after the first input. Resume on any tap, click or key.
9. **Establishing shot.** A 3 s camera sweep over the moat (castle, lake, maze, shrine) that settles behind the hero. Any input skips it and hands over control. Cut straight to the hero under `prefers-reduced-motion`.
10. **Close the Renderer panel by default,** behind a small gear icon, with the how-to text inside it.
11. **Contextual hints instead of the keybind line,** each shown once, then remembered.
12. **Progressive HUD:** start with the soul coil and minimap; reveal skills, hero sheet, camp clock and tier rows when they first matter.
13. **Auto cell size** from viewport width (about 160 to 220 columns), slider as override.
14. **Audio unlocks silently** on the first key or tap.

### Phase 3: Touch controls for phone and tablet (Gatewright)
One system that adapts, not two layouts. Simple on the surface: move with the left thumb, fight with the right. Everything else appears only when it is useful.

**Layout**
- **Left half of the screen = movement.** Touch anywhere on the left half and a floating analog stick appears under the thumb. Small push walks, full push runs, any direction (replaces the 4-button d-pad and adds diagonals and walking speed). Lift and it fades.
- **Right half = camera.** Drag on empty space on the right to turn the camera. Quick tap on an enemy = attack it and lock on.
- **Right thumb arc:** one large **Attack** button (tap = light combo, hold = heavy), with **Roll**, **Block** and **Spell** in an arc around it within thumb reach. Four buttons, not thirteen.
- **Context button:** appears above the arc only when it does something: Use (chest, shrine, gate), Mount, Leap. Hidden otherwise.
- **Skills drawer:** Dagger, Volley, Flask, Hero sheet, Map tucked into one small fan button that opens a radial menu. Locked skills do not show at all until earned.
- **Swipe gestures as shortcuts:** swipe up on the right half = roll forward, two-finger tap = switch target.

**Sizing by device** (all measured from the thumb, not the screen corner)
| Device | How detected | Controls |
|---|---|---|
| Phone portrait | coarse pointer, width < 600 | Stick and arc low in the bottom third; Attack 72 px; HUD squeezed to the top edge; gentle hint that landscape is roomier |
| Phone landscape | coarse pointer, height < 500 | Arc and stick hug the bottom corners; minimap shrinks; Attack 64 px |
| Tablet | coarse pointer, shortest side ≥ 600 | Controls sit in the lower-middle of each side where hands rest on a held tablet, not the far corners; Attack 88 px; full minimap and boss bars |
| Tablet + keyboard / mouse, desktop | fine pointer or a key press | Touch controls hide automatically the moment a key or mouse is used, and come back on the next touch |

- All sizes come from CSS custom properties driven by `@media (pointer: coarse)` plus width/height/aspect queries, so one stylesheet covers every device.
- Respect `env(safe-area-inset-*)` on every edge (notch, home bar, tablet rounded corners).
- **Left-handed mode** in the gear menu mirrors the layout.
- **Haptics:** a short `navigator.vibrate` tick on hit, parry and level-up where supported (Android); silent elsewhere.
- **Feel:** buttons react on `pointerdown`, never `click`; multi-touch so you can move, turn and attack at once; no browser zoom, scroll bounce or text selection (`touch-action: none`, `overscroll-behavior: none`).
- **Gamepad support** (Bluetooth controllers on tablets and phones) through the Gamepad API, mapped to the same actions.
- **Fullscreen** requested on the first tap on phones where allowed.
- **Auto quality:** if FPS stays under 40 for 3 s, drop water reflection, then grow cell size. No prompt.
- **Test matrix:** iPhone (Safari), Android phone (Chrome), iPad (Safari, held and with Magic Keyboard), Android tablet, plus the in-app browsers above. Check with the browser pane's mobile and tablet viewport presets first, then on real devices.

### Phase 4: The link itself (Veilwarden)
15. **Link previews:** Open Graph and Twitter card tags with a static 1200x630 ASCII image. No outside requests.
16. **Deep links:** `?world=veyra` starts at an unlocked world's gate, `?spirit` opens the Veil. Unknown values are ignored.
17. **Resume:** autosave every 30 s and on tab close; the bare link continues the run, `?new` starts fresh.
18. **PWA manifest + icon:** "Add to Home Screen" opens full screen with no browser bar, and launches offline thanks to the service worker.

### Phase 5: Guard it (Veilwarden)
19. **Headless smoke test in CI** (already on the roadmap), run at desktop, phone and tablet sizes: no console errors, not paused, canvas not blank after 2 s, no panel open, touch controls present only on touch sizes.
20. **Size budget:** CI fails if Brotli first-load size goes over 130 KB.
21. **Speed budget:** Lighthouse mobile run in CI; fail if first paint > 1 s or the page is blocked for more than 300 ms on simulated 4G.

### Release
22. Build, review on a preview URL on a real phone and tablet, then deploy to play.waysel.com only when Wasay says so. This also ships the not-yet-released spirit realm, map and multi-world storyline, so they need a play-through first.

## Order and size
| Phase | Size | Ships alone? |
|---|---|---|
| 1. Instant delivery | 1 to 2 days | Yes; biggest speed win |
| 2. Straight into the world | 1 day | Yes; biggest feel win |
| 3. Phone and tablet controls | 2 to 3 days | Yes |
| 4. The link itself | 1 day | Yes |
| 5. Guard it | Half a day | Do it alongside Phase 1 |

## Open questions
- Should the establishing shot always play, or only on a first visit?
- Should a returning player resume their run by default, or start fresh?
- Keep IBM Plex Mono (self-hosted, ~15 KB) or switch to the device's own monospace font (0 KB)?
