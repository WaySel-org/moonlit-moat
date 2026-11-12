# Handoff: Seasons

- **Date:** 2026-11-13
- **Role:** Loremaster
- **Issue / PR:** none yet
- **Branch:** loremaster/seasons

## What I changed
- `lore/seasons.md`: the story ships as six seasons, one world each, with spoiler-free teasers and how a season ships.
- `lore/README.md`: new premise (the Moon Wedding and the split moon) replacing the World Heart; links to seasons.
- `lore/chapters/01-the-moonlit-moat.md`: Season 1, The Broken Wedding, and the beat it ends on.
- `docs/roadmap.md`: Seasons under Next, Season 1 first.
- `.gitignore`: `lore/vault/`, where the full story bible with every twist lives on the maintainer's machine.

## How I tested it
`python3 tools/build.py` passes. Text only; no game code changed.

## What is left
- Season 1 in the game: cracked moon with a tracking pupil (`render/02-sky.js`), the brides' lucid lines, a wedding opening banner.
- A season gate for story beats (for example `content/seasons.json` with the released season).

## Notes for the next agent
Do not write later seasons' twists into `lore/`; the repository is public. Ask the maintainer for the story bible.
