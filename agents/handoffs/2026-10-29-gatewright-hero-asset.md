# Handoff: the sculpted hero

- **Date:** 2026-10-29
- **Role:** Gatewright
- **Issue / PR:** #10 (merged, then reverted on main by #11 because it went live without approval)
- **Branch:** gatewright/hero-asset (worktree: `../moonlit-moat-wt/hero`)

## What I changed
- `src/systems/actors/player/09b-hero-mesh.js`: the hero built in code. Blended signed-distance shapes (body, hooded coat, split skirt with folds, sash, shoulder guard, bracers, boots), meshed with surface nets (body at 0.0165 m cells, head and hood at about half that), baked occlusion, soft colour blends, a 20-bone skeleton with distance-based skin weights per body part. `heroPose()` sets the bones from a plain state object; `heroHandTarget()` places the right hand for a sword direction. Has no game dependencies, so the lab can load it.
- `src/systems/actors/player/09c-hero-rig.js`: game glue. Hides the old block figure (keeps `swordPivot`, the lantern light and every hook other files use), adds the mesh to `pBody`, replaces the sword parts with a forged sword (extruded blade with a point, curved guard, lathed grip and pommel), and `heroRigUpdate()` drives the pose each frame, with two-bone IK putting the right hand on the sword.
- `52-player-update.js` calls `heroRigUpdate()`; `36-gameplay-mask.js` sets `skinning` on the mask materials; `tools/build.py` budget raised to 290 KB (first load 280.8 KB).
- `tools/hero-lab/index.html`: shows the hero with orbit controls and buttons for every pose. `labSet(pose, yaw, pitch, dist, lookY)` frames shots from the console.

## How I tested it
Hero lab: idle, run, three slashes, heavy, block, cast, drink, jump, ride. In game with real key presses: run, J combo, Space jump combo, X roll, Shift block, F flask, U bolt, in Enhanced and Classic graphics. No console errors. About 43k triangles; builds in 0.3 to 0.4 s at load on a desktop.

## What is left
- At the normal camera distance the hero is small and reads mostly as a silhouette; the clay-smooth look lacks fabric detail.
- Colour boundaries still show slight zigzags up close; the sash tail leaves a pink streak on the coat front.
- Build time on tablets is untested (likely around 1 s). Baking the mesh at build time would remove it but costs download size.
- Ideas: a short capelet over the shoulders, a front opening line on the coat, better hand shape around the grip, reuse the pipeline for enemies and the royals.
- Optional route Wasay has not approved: the CC0 Quaternius packs (Universal Base Characters, Modular Character Outfits Fantasy, Universal Animation Library 2, about 420 MB) for a fully modelled hero.

## Notes for the next agent
- Never deploy to play.waysel.com or merge to main without Wasay's explicit go in that message. Show work on localhost (preview configs `hero-lab` on 8774 and `moonlit-hero` on 8775 in `RnD/.claude/launch.json`).
- To bring the hero back to main later, revert the revert from #11.
- Do not download asset packs without permission; open only verified links.
- Other sessions work in the main checkout; use your own worktree.
