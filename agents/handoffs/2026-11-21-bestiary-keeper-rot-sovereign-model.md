# Handoff: the Rot Sovereign (Necrophous) gets a modelled, animated body

- **Date:** 2026-11-21
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/ashfall-bosses`
- **Branch:** bestiary-keeper/ashfall-bosses

## What I changed
- `assets/bosses/rot-sovereign.glb` (1.67 MB, lazy): a skeletal king in a burial shroud with a crown of iron coffin
  nails and the Ember Shard glowing green in his open ribs. 5 in-place clips (idle, drift, cast, hurt, dead).
  Made with the `moonlit-character-design` pipeline from original concept art (folklore revenants and medieval tomb
  effigies; no game's lich or undead king): Hunyuan3D shape, the skull swapped in whole from a close-up shape,
  projected texture baked to a real UV layout, the godlings' legless skeleton and hand-keyed clips. No outside assets.
- `src/systems/world/ashfall/46m-rot-sovereign-glb.js` (new): loads the model on entering Ashfall and replaces the
  `rot` block figure (the game's green halo stays above the crown). Clip map: hover -> idle, moving -> drift, the
  1.1 s strike and every boss-kit ability (raise the dead, bone nova, grave grasp) -> cast, struck -> hurt.
- `src/systems/world/43-world-system.js`: `showWorld('ash')` also calls `loadRotSovereignModel()`.
- `src/systems/core/53-loop.js`: calls `rotModelUpdate(dt)` after the godlings.
- `tools/build.py` (Gatewright file, one line): emits `MM_ASSETS.rotSovereign`.
- `src/systems/manifest.json`: the new file after `46l-gorgemaw.js`.

No gameplay numbers changed. The block figure stays if the model fails to load.

## How I tested it
- `python3 tools/build.py`: first load 385.3 KB of 400 KB (the GLB is lazy, outside the budget).
- Served `dist/` with `dist/vercel.json`'s headers (prod CSP): the model loads with its 5 clips, no console errors.
- A throwaway dist-only hook brought Necrophous next to the hero in Ashfall: drift, hurt and cast (from a kit
  ability) all played. Hook removed; `dist/` rebuilt and grep of `src/` and `dist/` is clean.
- Not tested: a full fight to the kill, the ASCII renderer mode.

## What is left
- The dead clip is in the GLB but unused (a slain creep disappears at once).
- The block staff is hidden with the block body; a staff prop in his hand would be a follow-up.
