# Handoff: the Fallen Godlings get a modelled, animated body

- **Date:** 2026-11-14
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/godlings-glb`
- **Branch:** bestiary-keeper/godlings-glb

## What I changed
- `assets/creeps/godling.glb` (2.49 MB): one robed, masked god with 5 in-place clips (idle, drift, cast, hurt, dead).
  Made with the `moonlit-character-design` pipeline from original concept art: Hunyuan3D shape, mirrored to an exactly
  symmetric mesh, projected texture baked to a real UV layout, a hand-built skeleton with no legs (17 bones: trunk,
  head, two arms, three robe bones) and clips keyed by hand in Blender (no Mixamo, no outside assets).
- `src/systems/actors/creeps/25g-godlings-glb.js` (new): both godlings load the model. Aurelion the Sunless keeps its
  ivory and gold; Varghast the Hollow Thunderer is repainted at load time on a canvas (cloth to storm violet, metal to
  pale silver). Clip map: hover -> idle, moving -> drift, the 1.1 s strike -> cast (arms come down as it lands), struck
  between strikes -> hurt. The game's own halo ring stays. The models glow softly and sit in the gameplay mask (layer 2).
- `src/systems/core/53-loop.js`: calls `godlingModelUpdate(dt)` after the creeps update.
- `tools/build.py` (Gatewright file, one line): emits `MM_ASSETS.godling`.
- `src/systems/manifest.json`: the new file after `25f-gravebelly-glb.js`.

No gameplay numbers changed. The block figure stays if the model fails to load. The story bosses that reuse the
godling brain (matron, halvane, rot) and the mythics are a different creep type and are untouched.

## How I tested it
- `python3 tools/build.py`: first load 339.0 KB of 400 KB (the GLB is lazy, outside the budget).
- Served `dist/` with `dist/vercel.json`'s headers (prod CSP): both load, Varghast recolours.
- A throwaway dist-only hook brought both godlings in front of the camera: idle, drift and cast played on both, with
  real strikes landing on the hero. Hook removed; grep of `src/` and `dist/` is clean.
- Not tested: the hurt clip in play (mapped; they were mid-strike when hit), a natural meeting in the spirit realm,
  the ASCII renderer mode.

## What is left
- The dead clip is in the GLB but unused (a slain creep disappears at once).
- The wide sleeves are rigid on the arm bones (no cloth sway of their own).
