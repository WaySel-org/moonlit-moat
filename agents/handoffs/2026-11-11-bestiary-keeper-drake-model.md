# Handoff: the Ember Drake gets a modelled, animated body

- **Date:** 2026-11-11
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/drake-glb`
- **Branch:** bestiary-keeper/drake-glb

## What I changed
- `assets/mounts/drake.glb` (1.57 MB): rigged Ember Drake with 12 in-place clips (idle, walk, run, claw, breath,
  dive, lash, embers, roar, bow, hurt, dead). Made with the `moonlit-character-design` pipeline from original concept
  art (Cinderwing's young, by design: same family colours, no spine spikes, small wings, club tail): Hunyuan3D shape,
  projected texture, a Blender quadruped rig with wing and tail chains, hand-keyed clips (no Mixamo, no outside assets).
- `src/systems/actors/mounts/34b-mount-models.js`: `drake` entry in `MOUNT_MODELS` (scale 1.19, so the back sits at
  the block drake's 1.75 m under `rideHeight` 1.5) and `drakeClip`:
  J claw -> claw; stomp, trample and slam -> embers; Fire Breath -> breath; Tail Lash -> lash; Ember Rain -> embers;
  Space and Inferno Dive (both a leap) -> dive; Rampage and dash -> run; hurt -> hurt; flying away -> roar, then run.
- Tail Lash: `beastPose` spins the hidden block body a full turn; the model hangs on the outer group, so a new
  `spin` flag makes the drake model copy that turn (`M.root.rotation.y = b.body.rotation.y`). Stag and gryphon
  are unchanged.
- `tools/build.py` (Gatewright file, one line): emits `MM_ASSETS.drake`.

No gameplay numbers changed.

## How I tested it
- `python3 tools/build.py`: 88 systems, first load 324.6 KB of 400 KB (the GLB is lazy, outside the budget).
- Served `dist/` with the prod CSP headers: all four modelled mounts load with textures, no console errors.
- Ridden at the drake sanctuary; a throwaway dist-only hook logged every clip change: Y -> lash (model turns with
  the block body, both 5.38 rad mid-spin), U -> breath (fire in front, screenshot checked), I -> embers,
  O -> dive (leap), J -> claw, J J J -> claw, claw, embers (stomp), K -> run, Space -> dive, L -> run;
  ride time out -> roar, then run. Hook removed by a clean rebuild; grep of `src/` and `dist/` is clean.
- Not tested in play: hurt while mounted, mounted death (mapped, not seen), as for the stag and gryphon.

## What is left
- bow and dead are in the GLB but unused (beasts don't die; no mount-up animation yet).
- All three mounts now have models. Character files and logs: `~/Claude Docs/moonlit-characters/ember-drake/`
  (`models/README.md`, `game/README.md`).
