# Handoff: Nyxara gets a modelled, animated body

- **Date:** 2026-11-13
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/nyxara-glb`
- **Branch:** bestiary-keeper/nyxara-glb

## What I changed
- `assets/bosses/nyxara.glb` (5.05 MB): rigged Nyxara with 7 in-place clips (idle, move, fan, burst, vanish, hurt,
  dead). Made with the `moonlit-character-design` pipeline from original concept art: Hunyuan3D body shape, a second
  shape from the face close-up grafted on for the face, mirrored so the mesh is exactly symmetric, projected texture
  baked to a real UV layout (2K), Mixamo auto-rig and Mixamo animations.
- `src/systems/actors/bosses/20b-nyxara-glb.js` (new): lazy loader in the Warden's pattern. The block figure fights until
  the model arrives and stays if it fails to load. Clip map: hovering -> idle / move; thorn fan (orbs) -> fan and pyre ->
  burst, both timed so the cast lands with the attack's wind-up; blink -> vanish; her kit spells (Thorn nova, Briar
  lances) -> burst; the hunt's volley -> fan; stagger -> hurt; death -> dead. Hit flash and gameplay-mask layer carry over.
  Added back in code, per her style bible: two wings of overlapping briar leaves on the upper spine (they beat slowly,
  spread when she casts, fold when she falls) and her staff with its orb, carried upright in the right hand. The six
  thorn shards are unchanged.
- `src/systems/core/53-loop.js`: calls `nyxaraModelUpdate(dt)` right after the royals update.
- `tools/build.py` (Gatewright file, one line): emits `MM_ASSETS.nyxara`.
- `src/systems/manifest.json`: the new file after `20-rooftop-royals.js`.

No gameplay numbers changed (health, radius, attack timings and movement are as before). Vesthra is untouched.

## How I tested it
- `python3 tools/build.py`: first load 333.3 KB of 400 KB (the GLB is lazy, outside the budget).
- Served `dist/` with `dist/vercel.json`'s headers (prod CSP): the model loads, no console messages.
- A throwaway dist-only hook parked her in front of the camera and forced each state; the clip log showed
  idle, move, fan (orbs), burst (pyre), hurt (stagger), burst (kit), vanish (blink), dead. Hook removed; grep of
  `src/` and `dist/` is clean.
- Not tested: the full rooftop fight from the gate to the win screen; the ASCII renderer mode with the model.

## What is left
- The GLB is 5 MB (40k vertices, 2K texture); a lighter mesh would halve it.
- Arms and hands show jagged texture patches from the side.
- Vesthra still uses the block figure.
- Character files and logs: `~/Claude Docs/moonlit-characters/nyxara/` and `BOSSES.md`.
