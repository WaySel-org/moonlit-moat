# Handoff: Skip unused render work

- **Date:** 2026-11-14
- **Role:** Gatewright
- **Issue / PR:** #41
- **Branch:** gatewright/render-efficiency

## What I changed

- Raw skips the gameplay mask. ASCII and Split still render the friendly, hostile and skinned hero passes.
- The lake reflection renders only when the water intersects the main camera's view and the player is in the existing reflection range.
- Empty spark and firework meshes stay hidden until new particles spawn.

## How I tested it

Built and syntax-checked the game. In Edge, counted zero mask passes in Raw and three in ASCII and Split with the hero model loaded. From the same point near the lake, turning away stopped the reflection pass and turning back restored it. Ran a Node check covering particle spawn, expiry, idle uploads, and reuse after ring-buffer wraparound.

## What is left

FPS on target hardware has yet to be benchmarked. The local test server logs the existing favicon 404.

## Notes for the next agent

The particle arrays keep the cleared slots on the CPU while hidden. The next visible update uploads them before drawing the new burst.
