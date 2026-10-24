# Handoff: Ascension and mythics

- **Date:** 2026-10-24
- **Role:** Gatewright, with Shardkeeper of the Moat and Bestiary Keeper files
- **Branch:** gatewright/endless-ascension

## What I changed
- `world/moat/46c-ascension.js` (new): `ascend()`, the growing edge (`G.edge`), border runestones, pre-built rings (trees, stone circles, chest spots) revealed per Ascension, the queens' return lull, objective text, reset.
- `actors/creeps/25c-mythics.js` (new): ten mythic builders and roster, the wake director, map markers, bounty and reset.
- `winGame()` in `19` now calls `ascend()`; there is no 'won' end screen any more.
- Edge-aware: `groundAt` (04), hunt clamp (15), creep spawns (25), event spots (46b), minimap (47). Chests were refactored into `makeChest()` (26).
- Queens scale with Ascension (20); creeps scale +15% damage per Ascension (25); mythics reuse creep AIs with `grounded`, `venom`, `shotDmg`, `size`, `xpMult`.
- Hero sheet rows for Ascension and Mythics; help text; ten content files in `content/characters/mythics/`; lore in chapter 99.

## How I tested it
Build passes. In the app preview: every mythic spawned, attacked with its AI and died with a relic and banner; only the Manticore poisons. Killing both queens through `killRoyal` gave Ascension 1, edge 102 m, ring 1 revealed, two chests added, the lull and the queens' return. No console errors. The preview pane was hidden, so the loop was driven with `MM_DEBUG.frame` behind `#debug`.

## What is left
- Size budget is at 259.9 of 260 KB.
- Mythic and Ascension numbers are first guesses.
- The other worlds do not grow or spawn mythics.
