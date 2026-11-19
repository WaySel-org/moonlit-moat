# Handoff: Defer Vesthra's model

- **Date:** 2026-11-19
- **Role:** Bestiary Keeper
- **Issue / PR:** #53
- **Branch:** bestiary-keeper/fix-vesthra-startup-load

## What I changed

- Request Vesthra's GLB through the shared loader once she is visible within 30 game units or the rooftop fight starts.
- Keep the block figure visible while the request is pending or if it fails. The model and sickles retain their hostile gameplay layer when the swap succeeds.

## How I tested it

- `python tools/build.py` passed. The build reported 344.9 KB gzip against the 400 KB first-load budget.
- Headless Chrome loaded fresh Moat sessions with the repository CSP and no console errors. The cold-load comparison went from nine GLBs totaling 18,198,072 decoded bytes to eight totaling 14,533,220 bytes.
- Approached Vesthra in the field, entered combat on the roof, and used movement and attack inputs. Each path loaded the model once, including when the fight started before an approach. Aborting the request kept the block figure visible.

## What is left

Touch play and load timing on a slow connection were outside this test.

## Notes for the next agent

The nearest starting camp can place Vesthra within 45 units of the player spawn. The 30-unit threshold keeps the GLB off the opening network path in that case.
