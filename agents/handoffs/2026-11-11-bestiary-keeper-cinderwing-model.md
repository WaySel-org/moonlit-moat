# Handoff: Cinderwing gets a modelled, animated body

- **Date:** 2026-11-11
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/cinderwing-glb`
- **Branch:** bestiary-keeper/cinderwing-glb

## What I changed
- `assets/bosses/cinderwing.glb` (1.60 MB): rigged dragon with 11 in-place clips (fly, flee, glide, hover, fireball,
  breath, roar, hurt, dead, perch, walk). Made with the `moonlit-character-design` pipeline from original concept art:
  Hunyuan3D shape, projected texture, the Blender quadruped rig with wing and tail chains, clips keyed by hand
  (no Mixamo, no outside assets). The flight clips carry the body 1 m up; the glue offsets it.
- `src/systems/actors/bosses/21b-cinderwing-glb.js` (new): lazy loader in the Warden's pattern. The block dragon flies
  until the model arrives and stays if it fails to load. Clip map: circling -> fly, with glide now and then while calm;
  turning angry -> roar; struck between attacks -> hurt; fireball -> fireball (neck thrust timed to the moment it
  fires); breath -> breath; driven off -> flee. The block jaw marker and fire light move to the model's snout, so
  fireworks and fireballs leave from its mouth. Hit flash and gameplay-mask tagging carry over.
- `src/systems/core/53-loop.js`: calls `cinderwingModelUpdate(dt)` right after `updateDragon(dt)`.
- `tools/build.py` (Gatewright file, one line): emits `MM_ASSETS.cinderwing`.
- `src/systems/manifest.json`: the new file after `21-cinderwing.js`.

No gameplay numbers changed (hp, radius, attack timings, flight path are all as before).

## How I tested it
- `python3 tools/build.py`: 88 systems, first load 323.3 KB of 400 KB (the GLB is lazy, outside the budget).
- Served `dist/` with `dist/vercel.json`'s headers (prod CSP): `cinderwing.<hash>.glb` 200, every GLB 200, no console
  messages.
- A throwaway dist-only hook parked the dragon in front of the camera and logged clip changes:
  fly -> glide -> (hit) roar -> breath -> fly -> fireball -> fly -> (hit between attacks) hurt -> fly -> (driven off) flee.
  Breath set fire patches and killed the test hero, as before. Hook removed; grep of `src/` and `dist/` is clean.
- Not tested: how it looks through the ASCII renderer mode; the circling path at full speed with the pane in front
  (the hidden pane throttles frames).

## What is left
- dead, hover, perch and walk are in the GLB but unused today (Cinderwing flees, it does not die); they are for the
  open world (resting on the keep, walking on the ground).
- The neck no longer turns to look at the player (the block neck did); a head-bone look-at can be added.
- The raid dragons (Ashwing Wyrm, Rimefang Wyvern) can reuse this rig and these clips with their own texture.
- Character files and logs: `~/Claude Docs/moonlit-characters/cinderwing/` (`models/README.md`, `game/README.md`).
