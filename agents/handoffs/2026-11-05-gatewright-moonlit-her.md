# Handoff: Moonlit Her, the modelled hero

- **Date:** 2026-11-05
- **Role:** Gatewright (player)
- **Issue / PR:** pull request from this branch (not merged, not deployed)
- **Branch:** gatewright/moonlit-her-glb (worktree: `../moonlit-moat-wt/moonlit-her`), from origin/main 5b1e2d5

## What I changed
- `assets/hero/moonlit-her.glb` (3.2 MB, 1.7 MB gzip): textured, Mixamo-rigged hero with 27 animation clips named
  after the player's states (`idle run jump land light1 light2 light3 heavy roll rollslash rollcleave spin airslash
  plunge leap throw cast volley block parry hurt dead drink pickup`, plus `sneak stab dodge` not yet used).
  Every clip is in place (the game moves the player); airborne clips never rise above their start (the game lifts her).
- `vendor/three-r128-GLTFLoader.js`: the official r128 loader, unmodified, credited in THIRD_PARTY.md.
- `tools/build.py`: emits both as hashed lazy assets (outside the first-load budget) and exposes them as
  `window.MM_ASSETS`; `.glb` gets a `.gz` copy for nginx.
- `Dockerfile` + `.dockerignore`: copy `assets/` into the build stage (the build now reads the GLB from it).
- `src/systems/actors/player/09d-moonlit-her.js`: loads her after start, hides the block figure (keeps `swordPivot`,
  the lantern light and every hook), maps `P.act` / `P.combo` / `P.block` / `P.riposte` / jump to clips, stretches
  one-shot clips to `P.actDur`, keeps the sword in her right hand, mirrors hurt flash and petrify. Lambert material with
  a linear texture, like the rest of the game (the loader's PBR + sRGB rendered her near-black).
- `52-player-update.js`: calls `moonlitHerUpdate(dt, moving)` after `poseSword()` (both exits).
- `36-gameplay-mask.js` + `53-loop.js`: a skinned-only mask material on layer 3 and one extra mask draw once she is
  loaded. three r128 compiles one shader per material on first use, so the shared `maskFriend` drops skinned meshes
  out of the mask (measured: 0 mask pixels from her). With the fix she reads as bright, dense glyphs in ASCII.

## How I tested it
`python3 tools/build.py`: green, first load 313.9 KB of 400 KB. Played on localhost with real key presses in Raw and
ASCII views: idle, run, J combo, K heavy, L roll, Space jump, Y dagger, U bolt. No console errors. Her feet and hip
heights per clip were measured in three.js in the character-design workspace (`game/check.html`).

## What is left
- Not tested: Shift block/parry, Blade Spin, Warden's Leap, plunge, drink, death, riding, Classic graphics, tablets.
- Mounted: she plays `idle` on the beast (no riding clip yet).
- The sword grip offset (`HER_GRIP_POS/ROT`) is a first pass; check it close up in each attack.
- Light attacks are about 4x faster than Mixamo's clips (0.32 s vs 1.3 s); trim the clips if it looks frantic.
- The hip tanto is welded into the body mesh and bends with her hip in big moves.
- Licence check for Wasay: the animations come from Adobe Mixamo; confirm Mixamo's terms suit this open-source repo.

## Notes for the next agent
- The GLB is built in the character-design workspace (`~/Claude Docs/moonlit her character design`,
  `tools/build_glb.py`); rebuild there and copy it to `assets/hero/`, don't edit it here.
- Never push to main or deploy without Wasay's explicit go.
