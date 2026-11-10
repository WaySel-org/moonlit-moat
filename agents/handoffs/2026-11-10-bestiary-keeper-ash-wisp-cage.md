# Handoff: the Ash Wisp gets its modelled flake cage

- **Date:** 2026-11-10
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/ash-wisp-cage`
- **Branch:** bestiary-keeper/ash-wisp-cage

## What I changed
- `assets/creeps/ash-wisp-cage.glb` (270 KB): a static cage of 14 curled ash flakes (6,048 faces, no texture, no
  skeleton). Built procedurally in Blender from original concept art (Hunyuan3D can't make thin see-through flakes).
- `src/systems/actors/creeps/25e-wisp-cage.js`: loads the cage once after start and shares it with every wisp
  (roster, ancient camps, neutral camps, wave pool: 24). The block tail cone and halo are hidden; the game's flame
  sphere (`c.core`, still pulsed by the ranged brain) shrinks to a white-hot centre inside the cage. Code adds:
  a slow spin and tilt, a soft additive glow that flickers and **flares in the last 0.5 s before each shot** (the tell),
  a tail of ash specks and flame-coloured sparks drifting off behind (world space, so it trails when it moves), and
  on death the tail bursts outward into ash for about a second.
- Camp tints are kept: the glow and sparks take the wisp's own colour (gold for ancient camps, green for neutral ones).
- `src/systems/core/53-loop.js` (one call), `tools/build.py` (one lazy asset `MM_ASSETS.wispCage`),
  `src/systems/manifest.json` (the new file after `25d-crawler-glb.js`).

No gameplay numbers changed. The cage is scaled 1.8 (about 0.78 m across), close to the block wisp's 1 m halo.

## How I tested it
- `python3 tools/build.py`: 87 systems, first load about 321 KB of 400 KB (the GLB is lazy).
- Served `dist/` with prod headers: the cage loads, 24/24 wisps get it, no console errors.
- A throwaway hook (removed, grep clean) brought a wisp close, moved the camera for close-ups, forced the shot
  timer to check the flare (glow 0.8 -> 1.46), and killed it (burst plays, then tail and wisp hide).
- Not tested: full-speed play (browser pane hidden), ancient (gold) and neutral (green) wisps up close, a wave,
  performance with many wisps on screen.

## What is left
- STYLE.md's plan mentions a point light per wisp; left out on purpose (two dozen dynamic lights is costly). The
  inner flake faces carry a little flame-coloured self-light instead.
- The outer ash carries some of its own colour as self-light, or night lighting turns `#6E6E6A` near-black.

## Notes for the next agent
- Character files and logs: `~/Claude Docs/moonlit-characters/ash-wisp/` (`STYLE.md` changelog, `models/`).
- Cage builder: `~/Claude Docs/moonlit her character design/tools/build_wisp_cage.py` (seed 417, 14 flakes).
