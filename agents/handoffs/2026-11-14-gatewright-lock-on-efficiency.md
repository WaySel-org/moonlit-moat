# Handoff: Lock-on target checks

- **Date:** 2026-11-14
- **Role:** Gatewright
- **Issue / PR:** #48
- **Branch:** gatewright/lock-on-efficiency

## What I changed

Check the current target directly with the same eligibility rules used to build the roster. Scan for a replacement when the current target drops out. Player movement uses one target check for facing.

## How I tested it

Built and syntax-checked the game. Instrumented an Edge session and verified that ten checks of a valid lock built zero target lists. Crossing the 26-unit creep boundary caused one roster scan for a replacement. When the replacement died, the Warden took priority. An existing eligible lock stayed put when the Warden became eligible.

## What is left

Frame-time impact on target hardware is unmeasured.
