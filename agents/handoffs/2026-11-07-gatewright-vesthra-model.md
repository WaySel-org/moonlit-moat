# Handoff: Vesthra, the modelled and animated gorgon

- **Date:** 2026-11-07
- **Role:** Gatewright
- **Issue / PR:** pull request from this branch (not merged, not deployed)
- **Branch:** gatewright/vesthra-model

## What I changed
- `assets/bosses/vesthra.glb` (2.47 MB): Vesthra's textured mesh, a 26-bone rig with **no legs** (Mixamo-named upper
  body plus a 12-bone serpent tail) and 9 clips: idle, slash1, slash2, heavy, lunge, gaze, roar, hurt, dead.
  Made in the character-design workspace (`~/Claude Docs/moonlit-characters/vesthra/`, see its `rig/README.md`).
- `src/systems/actors/bosses/20b-vesthra-model.js` (new): lazy-loads the GLB after the game starts (outside the
  first-load budget), hides the sphere figure and its sickles but keeps the pivots the attack code turns, gives her
  two bronze sickles in her hands, and picks a clip each frame from `r.state` / `r.atk`:
  coil (tail sweep) -> heavy, gaze -> gaze, bash -> lunge, other attacks -> slash1/slash2, stagger -> hurt,
  dead -> dead, a kit cast (serpent rain, stone ring) -> roar, otherwise idle. One-shot clips stretch to the attack's
  wind + act + rec time. Hit flash is copied onto her material.
- `src/systems/actors/bosses/20-rooftop-royals.js`: two small edits. `updateRoyal()` calls `vesthraModelUpdate()`
  for the gorgon; the death tilt of the old figure is skipped once the model is in (the clip falls her over).
- `tools/build.py`: emits `vesthra.glb` into `window.MM_ASSETS` next to the hero model.
- `src/systems/manifest.json`: the new file after 20-rooftop-royals.js.

## How I tested it
- `python3 tools/build.py`: 84 systems, first load 315.9 KB gzip of 400 KB.
- Served `dist/` locally **with the production headers** (CSP from `dist/vercel.json`): her GLB loads (200), no
  console errors, no "did not load" warning. Textures load through `<img>` like Moonlit Her's.
- With a local-only test hook (never committed; dist rebuilt clean afterwards): stood next to her in the field
  (the local save had her out after an Ascension); idle, gaze (the real gaze petrified the test player), lunge, the
  coil, stagger -> hurt and death all switched to the right clip and played.
- Not tested: the full rooftop fight from the start, Nyxara next to her, phones/tablets, the Classic renderer.

## What is left
- Texture: soft repeat pattern on the tail; streaks on the sides of the snake hair (cosmetic).
- Sickles are simple shapes; their angle in the hand was eyeballed.
- Nyxara is still the primitive figure (next character in the pipeline).

## Notes for the next agent
- Vesthra has no legs, ever (Wasay's rule). Don't re-rig her on Mixamo's auto-rigger.
- Clip names are the GLB's animation names; if you add a state, add a clip in the workspace and rebuild the GLB
  with `tools/retarget_serpent.py` there.
