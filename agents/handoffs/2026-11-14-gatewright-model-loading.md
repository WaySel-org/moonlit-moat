# Handoff: Encounter model downloads

- **Date:** 2026-11-14
- **Role:** Gatewright
- **Issue / PR:** #42
- **Branch:** gatewright/model-loading

## What I changed

- The player and common Moat actors load at startup through one shared GLTF loader script.
- Nyxara loads on approach or when her rooftop fight starts. Gravebelly loads on Ashfall entry, the Godlings on Veil entry, and Tyrant Rex when its raid starts.
- The measurement tool accepts a cold startup HAR and reports the decoded GLB payload separately from the first-load estimate.

## How I tested it

Built and syntax-checked the game. Loaded a fresh Moat in Edge under the repository CSP and observed eight GLBs and one loader tag. Entered the Veil with Q, then used the debug hook to enter Ashfall, trigger the Rex raid, and start the rooftop fight. Confirmed each deferred model loaded. Checked the HAR totals against the eight opening asset sizes.

## What is left

On slower connections, the existing block models can appear until an encounter model arrives. The local server logs the existing favicon 404.

## Notes for the next agent

The shared loader uses the image loading path allowed by the existing CSP. Each load retains independent model instances and animation state.
