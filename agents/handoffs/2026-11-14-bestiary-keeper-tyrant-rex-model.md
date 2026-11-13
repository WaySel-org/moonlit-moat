# Handoff: the Tyrant Rex gets a modelled, animated body

- **Date:** 2026-11-14
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/tyrant-rex-glb`
- **Branch:** bestiary-keeper/tyrant-rex-glb

## What I changed
- `assets/bosses/tyrant-rex.glb` (1.28 MB): the Tyrant Rex, rigged with 7 in-place clips (idle, walk, run, bite, roar,
  rest, dead). Made with the `moonlit-character-design` pipeline from original concept art: Hunyuan3D shape from the
  side view, projected texture, a hand-built two-legged skeleton (19 bones) and clips keyed by hand in Blender
  (no Mixamo, no outside assets).
- `src/systems/world/46f2-raid-dragons-glb.js`: now covers all three raid bosses. The Rex loads its own asset, stands
  on the ground, and maps its states to clips: chase -> walk (idle when it stops), bite -> bite, charge -> roar through
  the wind-up then run, roar -> roar, rest -> rest (winded).
- `tools/build.py` (Gatewright file, one line): emits `MM_ASSETS.rex`.

No gameplay numbers changed. The block Rex stays if the model fails to load.

## How I tested it
- `python3 tools/build.py`: first load 337.8 KB of 400 KB (the GLB is lazy, outside the budget).
- Served `dist/` with `dist/vercel.json`'s headers (prod CSP): the model loads.
- A throwaway dist-only hook started the raid and forced each state; the clip log showed chase:walk, chase:idle,
  roar:roar, bite:bite, charge:roar, charge:run, rest:rest. Hook removed; grep of `src/` and `dist/` is clean.
- Not tested: a natural raid from spawn to kill; the ASCII renderer mode.

## What is left
- The dead clip is in the GLB but unused (a slain raider disappears at once).
- No jaw bone: the bite is a lunge of the head and neck.
