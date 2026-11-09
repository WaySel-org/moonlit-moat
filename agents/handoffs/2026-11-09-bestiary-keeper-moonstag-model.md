# Handoff: the Moonstag gets a modelled, animated body

- **Date:** 2026-11-09
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/moonstag-glb`
- **Branch:** bestiary-keeper/moonstag-glb

## What I changed
- `assets/mounts/moonstag.glb` (1.6 MB): rigged Moonstag with 11 in-place clips (idle, graze, walk, run, charge,
  rear, toss, stomp, bow, hurt, dead). Made with the `moonlit-character-design` pipeline from original concept art:
  Hunyuan3D shape, projected texture, a Blender quadruped rig and hand-keyed clips (no Mixamo, no outside assets).
- `src/systems/actors/mounts/34b-moonstag-glb.js`: loads the GLB after start, one copy per stag sanctuary (the block
  stag stays if it fails), hides the block body and maps the beast's state and the rider's action to a clip:
  wild walk/run/idle by speed; ridden run/idle; claw and Antler Toss -> toss; stomp, trample, Lunar Nova,
  Spectral Stampede -> stomp; Rampage, Starbound Charge, dash and pounce -> charge; hurt -> hurt;
  flying away -> rear, then run. One-shot clips are stretched to `P.actDur`.
- `src/systems/core/53-loop.js` (Gatewright file, one call): `mountModelUpdate(dt)` right after `updateBeasts(dt)`.
- `tools/build.py` (Gatewright file, one line): emits it as the lazy asset `MM_ASSETS.moonstag`.
- `src/systems/manifest.json`: the new file after `34-beasts-and-mounts.js`.

No gameplay numbers changed. `rideHeight` stays 1.25: the model is scaled 1.09 so its back sits where the block
stag's did (1.8 m), under the rider.

## How I tested it
- `python3 tools/build.py`: 85 systems, first load 318.1 KB of 400 KB (the GLB is lazy, outside the budget).
- Served `dist/` with `dist/vercel.json`'s headers (prod CSP): both stags load, texture included, no console errors.
- Played: walked to a sanctuary, mounted, galloped, J J J (toss, toss, stomp), K, Y, U, I, O, L, Space, dismount
  (it runs home), and the 3-minute fly-away (rears, then runs as it spirals up). The rider sits on the back.
- A throwaway dist-only hook moved the player to the sanctuary and read the playing clip; removed, grep is clean.
- Not tested in play: the rider being hit while mounted (hurt clip mapped, not seen), mounted death.

## What is left
- graze, bow and dead are in the GLB but unused: wild stags never stand still (they always pick a new wander point),
  and beasts don't die. A pause-and-graze for wild stags would be a behaviour change; ask first.
- The block stag's antler glow pulse (`glowM`) has no effect on the model; the antlers are painted with the glow.
- Gryphon and Ember Drake still use block figures; they are next in the same pipeline.

## Notes for the next agent
- Character files and logs: `~/Claude Docs/moonlit-characters/moonstag/` (`models/README.md`, `game/README.md`).
- The model is added to the beast's outer group, not `b.body`, so `beastPose`'s body tilts don't stack on the clips.
