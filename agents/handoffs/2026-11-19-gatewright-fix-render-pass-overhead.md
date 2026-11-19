# Handoff: Share scene transform updates across render passes

- **Date:** 2026-11-19
- **Role:** Gatewright
- **Issue / PR:** #52
- **Branch:** gatewright/fix-render-pass-overhead

## What I changed

- Update visible scene branches once after simulation and camera placement. Skip branches whose root is hidden. Refresh the sky when the reflection moves and restores it, and refresh the moon and torch transforms before the main pass.
- Skip Enhanced bloom in full ASCII. Check both dimensions when sizing the blur targets so bloom follows a height-only resize in Raw and Split.

## How I tested it

- `python tools/build.py` passed at 345.2 KB gzip against the 400 KB first-load budget.
- Headless Chrome with the repository CSP reported no console errors through movement, sword and jump inputs, a height-only resize, reflection toggles, and a switch from the Moat to Veyra.
- Checked Raw, ASCII and Split in Enhanced, plus Raw and ASCII in Classic. Compared visible world matrices at pass entry against a full recompute. Verified sky placement, water visibility, the shadow update flag, mask passes and bloom target dimensions.
- In the opening view with the lake visible, the scene-matrix walk fell from five to one per ASCII frame and from two to one per Raw frame. In the updated Raw smoke test, skipping hidden branches left about 2,600 of 10,400 children and descendants to visit. Enhanced ASCII went from four bloom passes to zero per frame.

## What is left

The local Chrome runs stayed below the 50 FPS target. Check frame pacing on target hardware, including touch devices. The main and reflection passes still submit several hundred thousand triangles each in the opening view.

## Notes for the next agent

The three.js r128 renderer's automatic scene update is disabled for the game scene. The frame loop owns that update. Any transforms changed between passes need an explicit refresh before the next pass uses them.
