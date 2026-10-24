# Handoff: combat depth, new creeps and relics

- **Date:** 2026-10-23
- **Role:** Gatewright (with Bestiary Keeper files for the two creeps)
- **Issue / PR:** none yet
- **Branch:** gatewright/combat-depth

## What I changed
- `actors/player/18b-combat-depth.js` (new): `strike()` wraps every player hit with crit, backstab, Riposte and Flow; Rend and poison timers; `updateStatus`, `updateRend`.
- `actors/player/23b-relics.js` (new): the ten relics, ground drops with labels, pickup, slot limit, drop from the hero sheet.
- `actors/creeps/25-creeps.js`: roster is now a list (11 crawlers, 7 wisps, 5 stalkers, 4 thornbacks); `updateStalker` and `updateGuard` AIs; Thornback guard rule and longer stagger in `damageCreep`; relic drops on ancients (40%) and godlings.
- Hooks: `16` (roll resets Flow, bolt cost, Thief's Step), `17` and `34` and `52` (route damage through `strike`, Ember Heart trail, flask cures poison and heals 50 with Lantern Wick), `18` (Flow on perfect dodge, Riposte and Wardstone on parry, `calm` reset), `19` (Warden drops a relic), `23` (relic bonuses in `recalc` and `reward`, combat rows), `26` (chest relic chance), `46b` (elite and stage relic drops), `22` (resets), `53` (new update calls, chips), `28` (bar heights, bolt cost), `54-debug.js` (new, `#debug` hook).
- `content/characters/creeps/fen-stalker.json`, `thornback.json`; `index.html` hero sheet and help text; `game.css` chips and relic rows.

## How I tested it
`python3 tools/build.py` passes (60 systems, 18 characters). Played in the app preview with no console errors: crits, Flow, parry and Riposte, Rend on creeps and on the Warden, Thornback guard and backstab, Fen Stalker lunge with poison and the flask cure, relic pickup, the slots-full message, stat changes and the Drop button. Not played: the rooftop royals and the other worlds with the new systems (they only receive `strike` through the shared path, no new code runs there).

## What is left
- Balance: Rend is 5 x weapon multiplier per stack per half second; the Thornback's 120 base health and 30% front damage; poison 2 x creep multiplier per half second for 6 s. Tune in play.
- Rend does not tick on the rooftop royals (they keep their own damage path).
- Relics are not saved between reloads (nothing is).

## Notes for the next agent
- Add a relic by adding one entry to `RELICS`; read it with `relicHas(id)` or `relicBonus(key)`.
- A new creep needs a builder, a `CREEP_AI` entry, an `update<Ai>` branch in `updateCreep`, `CREEP_NAME`, `CREEP_BASE`, `CREEP_XP`, `CREEP_BAR_H` and a content file.
- Open the game with `#debug` to reach `window.MM_DEBUG` from the console.
