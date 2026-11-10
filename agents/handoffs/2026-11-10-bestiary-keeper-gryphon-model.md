# Handoff: the Gryphon gets a modelled, animated body

- **Date:** 2026-11-10
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/gryphon-glb`
- **Branch:** bestiary-keeper/gryphon-glb

## What I changed
- `assets/mounts/gryphon.glb` (1.72 MB): rigged Gryphon with 11 in-place clips (idle, walk, run, pounce, gust, rake,
  storm, screech, bow, hurt, dead). Made with the `moonlit-character-design` pipeline from original concept art:
  Hunyuan3D shape, projected texture, a Blender quadruped rig with wing and tail chains, hand-keyed clips
  (no Mixamo, no outside assets).
- `src/systems/actors/mounts/34b-moonstag-glb.js` -> `34b-mount-models.js`: one loader for every modelled mount,
  driven by a `MOUNT_MODELS` table (asset, scale, looping clips, clip map per type). The stag's clip map is unchanged.
  Gryphon map: claw and Talon Rake -> rake; stomp, trample, slam and Gale Wing -> gust; Feather Storm -> storm;
  Space and Sky Pounce -> pounce; Rampage and dash -> run; hurt -> hurt; flying away -> screech, then run.
- **Fix for the live Moonstag:** the mount GLBs carry their texture as the emissive map, and the old glue read only
  `material.map`, so the stags on play.waysel.com render untextured (plain white). The loader now uses
  `map || emissiveMap`; stags and Gryphon both show their painted textures.
- `tools/build.py` (Gatewright file, one line): emits `MM_ASSETS.gryphon`.
- `src/systems/manifest.json`: the renamed file.

No gameplay numbers changed. `rideHeight` stays 1.45: the model is scaled 1.45 so its back sits where the block
gryphon's did (1.9 m), under the rider.

## How I tested it
- `python3 tools/build.py`: 87 systems, first load 321.6 KB of 400 KB (the GLB is lazy, outside the budget).
- Served `dist/` with `dist/vercel.json`'s headers (prod CSP): both stags and the Gryphon load with textures, no
  console errors.
- Ridden at the gryphon sanctuary; a throwaway dist-only hook logged every clip change: J -> rake, J J J -> rake,
  rake, gust; K -> run; Y -> rake; U -> gust; I -> storm; O -> pounce; L -> run; E dismount (wild, runs home);
  fly-away -> screech, then run. Hook removed; grep of `src/` and `dist/` is clean.
- Not tested in play: hurt while mounted, mounted death (mapped, not seen), as for the stag.

## What is left
- bow and dead are in the GLB but unused (beasts don't die; no mount-up animation yet).
- Ember Drake is next in the same pipeline.
- Character files and logs: `~/Claude Docs/moonlit-characters/gryphon/` (`models/README.md`, `game/README.md`).
