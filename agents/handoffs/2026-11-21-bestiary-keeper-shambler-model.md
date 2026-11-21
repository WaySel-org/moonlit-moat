# Handoff: the Shambler gets a modelled, animated body

- **Date:** 2026-11-21
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/shambler-glb`
- **Branch:** bestiary-keeper/shambler-glb

## What I changed
- `assets/creeps/shambler.glb` (2.4 MB, lazy): the Ashfall zombie from the original Shambler concept (Hunyuan3D
  shape, projected texture), rigged by Mixamo's auto-rigger. 7 in-place clips from Wasay's own Mixamo account
  (royalty-free for games): idle, walk, attack (swipe), rise (stand up from the ground), hurt, dead, scream.
- `src/systems/actors/creeps/25j-shambler-glb.js` (new): loads on entering Ashfall; every Shambler gets its own
  skinned copy (block figure stays if the load fails). Climbs out of the ground on spawn, walks at the speed the
  brain moves it, swipes in time with the melee wind-up (the fastest frame of the swing lands on the hit),
  flinches when struck, falls and lies for 2.8 s on death.
- `src/systems/world/43-world-system.js`: `showWorld('ash')` also calls `loadShamblerModels()`.
- `src/systems/core/53-loop.js`: calls `shamblerUpdate(dt)` after the Gravebelly.
- `tools/build.py` (Gatewright file, one line): emits `MM_ASSETS.shambler`.
- `src/systems/manifest.json`: the new file after `25f-gravebelly-glb.js`.

No gameplay numbers changed.

## How I tested it
- `python3 tools/build.py`: first load 385.9 KB of 400 KB (the GLB is lazy).
- Pipeline gate in Blender: feet within 2 cm of the ground in every clip, zero hip travel.
- Served `dist/` with prod headers (CSP): the model loads, all 50 Ashfall Shamblers get it, no console errors.
  Seen in game walking at the hero and swiping inside the red wind-up ring.
- A throwaway dist-only hook drove the update: rise -> idle, hurt, attack (swing peak 1.06 s vs 1.04 s target),
  dead, corpse hidden after. Hook removed; `dist/` rebuilt clean.
- Not tested: the ASCII renderer mode, a long wave fight.

## What is left
- The chase (3.7 m/s) runs the walk clip at its 3.2x cap, so it may slide slightly at full chase speed.
- The scream clip is in the GLB but unused.
