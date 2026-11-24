# Handoff: Nyxara walks, runs and backs away

- **Date:** 2026-11-14
- **Role:** bestiary-keeper
- **Branch:** bestiary-keeper/nyxara-walk-run

## What I changed
- `assets/bosses/nyxara.glb` (5.18 MB, was 5.05): three more in-place Mixamo clips on the same skeleton: walk
  (Walking), run (Running), walkback (Walking Backwards). Same build flags as before (`--in-place --ground dead --jpeg`).
- `src/systems/actors/bosses/20b-nyxara-glb.js`: when she travels (state chase, not casting) she sets down on the floor
  and plays a gait: walk at rooftop pace, run above 3.3 u/s (field chase, the hunt), walkback when she backs away while
  facing the player. The clip's speed follows her real speed so the feet don't slide. Her hips turn toward a sideways
  drift (up to about 70 degrees) and back to the player when she stops. Standing and casting she floats as before.
  Grounding is done on the model inside `r.body`, so `updateRoyal` and every gameplay number are unchanged.

## How I tested it
- Clip gate (`check.html` in the character folder): walk, run and walkback stand on the floor within 2.5 cm, zero hip travel.
- `python3 tools/build.py`: first load 343.8 KB of 400 KB.
- `dist/` served with the prod CSP headers: the model loads with 10 clips, no console messages. A throwaway dist-only
  hook drove her at 2.4, 5.0, -2.6 (backing away) and 1.4 sideways: the clip log showed walk, run, walkback, walk (hips
  turned 0.88 rad), then idle with the model back at hover height. Hook removed, `src/` and `dist/` grep clean.
- Not tested: a full rooftop fight from the gate to the win screen.

## What is left
- The old `move` (drift) clip now plays only for slow drifts under 1 u/s.
