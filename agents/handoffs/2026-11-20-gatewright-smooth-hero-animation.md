# Handoff on hero animation blending

- **Date** 2026-11-20
- **Role** Gatewright
- **Issue** #59
- **Branch** `gatewright/smooth-hero-animation`

## What changed

The hero's animation mixer now begins an interrupted 100 ms blend at the weights it was displaying. Returning to a loop while it is fading keeps its playback phase. Clips stop after their contribution reaches zero so they no longer occupy an active mixer slot.

## Verification

- `python tools/build.py` passed with 96 systems and a 345.4 KB gzip start bundle.
- A test using the shipped GLB and Three r128 interrupted an idle-to-run transition with hurt after 40 ms. The original changed the left knee by 24.16° with zero elapsed time. The patch produced no knee or bone-position jump.
- A rapid run-to-idle-to-run reversal kept the run clip at 0.23 seconds. A light strike reached half its clip at 0.16 seconds of a 0.32-second action and reset to its first frame on explicit restart.
- Local Chromium accepted movement, fast directional input, light attack, roll, and jump. Both Raw and ASCII rendered. The console reported the existing missing favicon and had no JavaScript exceptions.

## Follow-up

The Bestiary Keeper can use the same interruption test on enemy and mount transitions. Some actors run or fly in place when their collision stops movement, and several imported rigs need a skinned ASCII mask.
