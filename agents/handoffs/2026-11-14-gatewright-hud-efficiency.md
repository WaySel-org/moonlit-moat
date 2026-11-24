# Handoff: Avoid unchanged HUD writes

- **Date:** 2026-11-14
- **Role:** Gatewright
- **Issue / PR:** #47
- **Branch:** gatewright/hud-efficiency

## What I changed

Cache skill elements, format interaction text once for the active input, and skip unchanged text, visibility, and cooldown updates.

## How I tested it

Built and syntax-checked the game. In Edge, observed zero mutations across several stable frames for the six watched elements. Confirmed the chest prompt switches to touch wording, health and flask counters respond, cooldowns display, the shrine shop hides the prompt, and desktop and touch mount skill labels match.

## What is left

Frame-time impact on target hardware is unmeasured. The local server logs the existing favicon 404.
