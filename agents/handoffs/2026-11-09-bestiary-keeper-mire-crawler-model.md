# Handoff: the Mire Crawler gets a modelled, animated body

- **Date:** 2026-11-09
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/mire-crawler-glb`
- **Branch:** bestiary-keeper/mire-crawler-glb

## What I changed
- `assets/creeps/crawler.glb` (1.57 MB): rigged six-legged marsh beetle with 5 in-place clips (idle, walk, attack,
  hurt, dead). Made with the `moonlit-character-design` pipeline from original concept art: Hunyuan3D shape, projected
  texture, a custom Blender armature (body, head, 2 mandibles, 6 legs x 3 bones) and hand-keyed clips. No outside assets.
- `src/systems/actors/creeps/25d-crawler-glb.js`: loads the GLB once after start and gives every crawler (roster,
  ancient camps, neutral camps, wave pool: 48 in all) its own skinned copy. The block crawler stays if loading fails.
  State -> clip: moving -> walk (rate follows speed), still or stunned -> idle, melee wind-up -> attack (timed so the
  mandibles snap as the wind-up ends and the hit lands), fresh hit -> hurt, death -> dead.
- On death the body stays for 1.6 s so the roll onto its back can play, then hides. The creep is already dead in the
  game (no hits, no target, no bar); this is only visual.
- `src/systems/core/53-loop.js` (Gatewright file, one call): `crawlerModelUpdate(dt)` right after the creeps update.
- `tools/build.py` (Gatewright file, one line): emits it as the lazy asset `MM_ASSETS.crawler`.
- `src/systems/manifest.json`: the new file after `25c-mythics.js`.

No gameplay numbers changed. The model is scaled 1.25 (1.25 m long) to match the block crawler's footprint and its
0.6 hit radius; spawn scaling (ancient 1.8x, +8% per level) still applies on top. Each crawler gets its own material so
the hit flash and the ancient glow still work; the neutral-camp tint no longer applies (the texture carries the colour).

## How I tested it
- `python3 tools/build.py`: 86 systems, first load 319.7 KB of 400 KB (the GLB is lazy, outside the budget).
- Served `dist/` with `dist/vercel.json`'s headers (prod CSP): the GLB and its texture load, all 48 crawlers get the
  model, no console errors.
- A throwaway hook brought a crawler next to the hero and triggered walk, bite, hit and kill; read the playing clip,
  the corpse timer and the flash. Removed; grep of `src/` and `dist/` is clean.
- The browser pane was hidden, so the game ran throttled: states and timings were checked by numbers and small
  screenshots, not by watching a full-speed fight.
- Not tested: an ancient crawler (1.8x) up close, neutral camps, a full wave in play, performance with many on screen.

## What is left
- Ash Wisp: its flake cage is built (`moonlit-characters/ash-wisp/models/ash-wisp-cage.glb`), not wired yet.
- The model stands 0.71 m tall including the reed sprig at 1.0x; at 1.25x the shell is about 0.68 m.
- If many crawlers on screen cost too much, skip `mixer.update` for crawlers far from the camera.

## Notes for the next agent
- Character files and logs: `~/Claude Docs/moonlit-characters/mire-crawler/` (`STYLE.md` changelog, `models/`).
- The model is added to `c.body` (so wave rise-from-ground offsets still apply); the block meshes are hidden, not removed.
- three r128's vendored build has no SkeletonUtils; `cloneCrawlerScene` rebinds each copy's skeleton by bone name.
