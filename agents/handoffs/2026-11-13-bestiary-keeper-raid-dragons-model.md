# Handoff: the raid dragons get modelled, animated bodies

- **Date:** 2026-11-13
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/raid-dragons-glb`
- **Branch:** bestiary-keeper/raid-dragons-glb

## What I changed
- `src/systems/world/46f2-raid-dragons-glb.js` (new): the Ashwing Wyrm and the Rimefang Wyvern wear Cinderwing's body,
  skeleton and hand-keyed clips (`assets/bosses/cinderwing.glb`, already a lazy asset, so no new download). Each gets its
  own colours at load time: the texture's brightness is mapped through a colour ramp on a canvas (Ashwing charcoal ash
  with an ember belly and horns, Rimefang steel blue with an ice-pale belly and white horns), and its own size
  (x1.3 and x1.1). The block dragon flies until the model arrives and stays if it fails to load.
  Clip map: circle -> fly; strafe -> hover through the wind-up, then flee along the lane; hover (the breath attack) ->
  breath; rest -> perch, standing on the ground under the raider. The models are in the gameplay mask (layer 2).
- `src/systems/world/46f-waves-and-raiders.js`: one call, `raidDragonModelUpdate(G.raid.r, dt)`, after `updateRaider`.
- `src/systems/manifest.json`: the new file after `46f-waves-and-raiders.js`.

No gameplay numbers changed. The Tyrant Rex still uses its block figure.

## How I tested it
- `python3 tools/build.py`: first load 336.3 KB of 400 KB.
- Served `dist/` with `dist/vercel.json`'s headers (prod CSP): both dragons load and recolour (the canvas read is
  same-origin, so the CSP allows it); a fresh tab's console is empty.
- A throwaway dist-only hook started each raid and forced each state: fly, hover, flee, breath and perch all played on
  both dragons. Hook removed; grep of `src/` and `dist/` is clean.
- Not tested: a natural raid from spawn to kill; the ASCII renderer mode.

## What is left
- Both are palette variants of Cinderwing's body; neither has its own silhouette yet (a wyvern would have two legs).
- No hurt reaction on raiders (the game has no hurt state for them).
