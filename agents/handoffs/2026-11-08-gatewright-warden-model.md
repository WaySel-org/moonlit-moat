# Handoff: the Gate Warden gets a modelled, animated body

- **Date:** 2026-11-08
- **Role:** gatewright
- **Issue / PR:** see the PR for branch `gatewright/warden-glb`
- **Branch:** gatewright/warden-glb

## What I changed
- `assets/bosses/warden.glb` (2.6 MB): rigged Warden with 9 in-place clips (idle, walk, run, slam, sweep, leap, roar,
  hurt, dead). Built with the `moonlit-character-design` pipeline; Mixamo rig and clips from WaySel's own account
  (royalty-free for games).
- `tools/build.py`: emits it as the lazy asset `MM_ASSETS.warden` (outside the 400 KB first-load budget).
- `src/systems/actors/bosses/19b-warden-glb.js`: loads the GLB after start (block figure stays if it fails), hides the
  block shapes, maps `B.state` / `B.atk` to clips and stretches one-shot clips to the behaviour's own timings, moves
  the existing hammer meshes into the right hand and hangs the existing cape from the shoulders, copies the hit flash.
- `src/systems/core/53-loop.js`: calls `wardenModelUpdate(dt)` right after `updateBoss(dt)`.
- `src/systems/manifest.json`: the new file after `19-warden-behaviour.js`.

## How I tested it
- `python3 tools/build.py`: 85 systems, first load 317.1 KB of 400 KB.
- Served `dist/` with `dist/vercel.json`'s headers (prod CSP): GLB 200, no console errors.
- Played the fight locally: leap-in intro, chase, charge with the hammer in hand.
- A throwaway three.js page rendered every clip at 3 points with the hammer and cape (slam lands the head on the ground,
  sweep swings it out); not committed.
- Not tested in play: stagger, the phase-2 roar, death and the hunt / echo revival.

## What is left
- Phase 2 no longer turns the visor red (the model's ember visor is painted); a tint could come back via emissive.
- The cape is a flat plane hung from the shoulders; it does not sway yet.

## Notes for the next agent
- Character files and logs: `~/Claude Docs/moonlit-characters/warden/` (`models/README.md` has every step).
- If the camera looks into a dark wall during the fight, the hero is pressed against the castle wall; that camera
  behaviour predates this change.
