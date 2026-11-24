# Handoff: Gravebelly model (Ashfall's ranged creep, code key `bloater`)

- **Date:** 2026-11-13
- **Role:** bestiary-keeper
- **Issue / PR:** see the PR for branch `bestiary-keeper/gravebelly-glb`
- **Branch:** bestiary-keeper/gravebelly-glb

## What I changed
- `assets/creeps/gravebelly.glb` (2.7 MB, lazy): the buried villager with the cracked clay-urn belly, Blender rig with
  Mixamo bone names, 7 clips: idle, walk, attack (Mixamo "Throw Object": doubles over, then heaves), scream (spare,
  unused), rise (stand-up from lying on its back), hurt, dead (falls onto its back).
- `src/systems/actors/creeps/25f-gravebelly-glb.js`: loads it once, gives every `bloater` creep its own skinned copy
  (set up lazily, so wave and realm-parity Gravebellies get it too), maps state to clip. Visual only:
  - pulls the model down by the ranged brain's hover (`c.pos.y` sits ~1.3 m up) so the feet stay on the ground;
  - starts the throw 1.2 s before the brain's cooldown runs out, sped up so the release (2.46 s into the clip) lands
    on the shot; the creep doubles over first, which is the tell;
  - draws its shots as tumbling soil clods with dull ember flecks (same mesh object, same flight and hit);
  - rise clip on every spawn; dead clip with a 2.6 s corpse; hurt on a fresh hit; walk plays backwards when it backs
    away from the hero while facing it.
- `tools/build.py`: `gravebelly` lazy asset. `manifest.json`: the new file after `25e`. `53-loop.js`: `gravebellyUpdate(dt)`.

## How I tested it
- `python3 tools/build.py`: first load 335.7 KB gzip of 400 KB; the GLB served 200 under the prod CSP headers.
- Local play, Ashfall, with a temporary DOM-event test hook (removed; `gbtest` count 0 in src and dist):
  all 18 Gravebellies got the model; the feet stay on the ground (offset -1.0 to -1.5 m following the hover bob);
  the throw starts at cooldown 1.2 and the shot fires at the end as a clod (1 clod / 1 shot); it goes back to idle
  after; the kill plays the dead clip with the body visible for the corpse timer; a respawn plays the rise clip.
  No console errors.
- NOT tested at full frame rate: the browser pane was hidden, which throttles the game. Not seen as a close-up.

## What is left
- Wasay to play it before shipping (not merged, not deployed).
- The name still says "Bloater" on main; the rename is PR #25.
- The walk is a slow zombie walk (about 0.3 m/s at 1x); the brain moves Gravebellies at about 2.5 m/s when it
  repositions, so the walk is sped up to at most 2.2x and the feet slide a little. Tune `GB_WALK` / the cap if it
  reads badly.
- `scream` is in the GLB but unused (a wave roar or an alternate attack later).

## Notes for the next agent
- The ranged brain has no wind-up, so the tell is driven from `c.cool`; `c.aware` flickers for single frames, so it
  is debounced (0.5 s) before it can cancel a wind-up.
- Character source, rig script and logs: `~/Claude Docs/moonlit-characters/gravebelly/` (STYLE.md changelog).
