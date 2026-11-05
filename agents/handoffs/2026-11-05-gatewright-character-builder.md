# Handoff: the character builder and visible gear

- **Date:** 2026-11-05
- **Role:** Gatewright (player, UI, tooling) with the Bestiary Keeper's content format
- **Issue / PR:** see the PR from `feature/character-maker`
- **Branch:** feature/character-maker

## What I changed
- `assets/character/` (13 MB, lazy-loaded): kit.glb (52 meshes on one 65-bone rig), anims.glb (50 clips), tint-map
  textures. Built by `tools/character/build_kit.mjs` from the CC0 Quaternius packs (see THIRD_PARTY.md).
- `content/character/looks.json`: bodies, skin tones, hair, brows, beards, eyes, shape sliders, four presets.
  `content/character/gear.json`: 49 items in 8 slots with looks and stats. `testing.unlockAll` is **true** (every
  item in the armoury from the start, as asked for play-testing); `#allgear` in the URL does the same.
- `actors/player/09e-character-kit.js`: loads the kit, builds an avatar from look + gear on one shared skeleton,
  hides body regions under gear, beard styles cut from one beard mesh, bone-scale body shapes, sockets on bones.
- `09f-gear-forge.js`: helmets, cuirass, pauldrons, gorget, gauntlets, greaves, sabatons, shields, lantern,
  grimoire, swords, axe, hammer, spear and staff, sized from the body's own region boxes.
- `09g-cloth.js`: Verlet cloth (capes, shawl, scarf, skirts) pinned to bones, colliding with torso, leg and arm capsules.
- `09h-hero-avatar.js`: swaps the avatar in for the block figure, maps every `P.act` to a clip stretched to the
  game's own durations, armoury, `heroEquip`, gear stats, the look's own save (`moonlit-moat.hero.v1`).
- `ui/28e-builder-stage.js` and `ui/57-character-builder.js` (+ markup and CSS): the builder. First visit opens it;
  C, the pause screen and the bag open it later. `#nobuilder` in the URL skips it.
- Edits: arsenal `applyGear` adds armour stats and armour drops (35% of drops, off while unlockAll), save keeps
  `PR.inv.gear`/`armoury`, input gives the builder the keyboard, the loop hands the frame to the builder, the mask
  draws the skinned hero on layer 3, controls list gains C.
- `tools/build.py`: validates content/character against kit.json and emits the kit as lazy hashed assets.

## How I tested it
`python3 tools/build.py` passes (first load 340.6 KB of 400). Headless Chrome against `dist/`: first-visit builder,
every tab, all four presets on both bodies, cloth from the back, poses, Done, C and Esc in game; in game W, J J K,
L, Space, U, F all animate with the right timing; ASCII view keeps the hero bright. No console errors.
Not tested: tablets/touch in the builder, Classic graphics, riding (the seated clip is a chair pose, not astride),
Warden's Leap, spin, death, the spirit realm.

## What is left
- Riding needs an astride pose (legs apart); today it is `Sitting_Idle_Loop`.
- Rigid plate rides one bone each: deep twists can open small gaps at the waist.
- Cloth is per-hero only and ignores the beast when mounted.
- Set `testing.unlockAll` to false before a release so gear drops matter.

## Notes for the next agent
- Shared scope: every system file is concatenated into one closure, so new top-level names need a unique prefix
  (`ck`, `fg`, `cl`, `hero`, `b`).
- The lab (`tools/character-lab/`, gitignored, local only) loads the kit without the game for fitting gear:
  serve the repo root on 8790 and open /tools/character-lab/.
