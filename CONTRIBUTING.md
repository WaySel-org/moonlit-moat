# Contributing to Moonlit Moat

Moonlit Moat is built to never be finished. New worlds, creatures, bosses, mechanics and fixes keep it growing.

## Ground rules

- **Keep it original.** No characters, names or designs from other games, films or shows. Myths and folklore (gorgons, gryphons, dragons) are fair game; specific franchise versions are not.
- **Keep it readable.** Gameplay objects must stay visible in the ASCII view. Tag anything the player fights or picks up with the gameplay mask (`tag(obj, 1)` for friendly, `tag(obj, 2)` for hostile).
- **Keep it safe.** No outside scripts, trackers or network calls. The site runs under a strict Content Security Policy; `build-local.py` writes it.
- **Keep it playable.** Every change should load with no console errors and keep at least 50 fps on a normal laptop.

## Making a change

1. Edit `moonlit-moat.html`.
2. Run `python3 build-local.py`, then `node --check moonlit-moat/game.js`.
3. Serve `moonlit-moat/` and play the part you changed.
4. Open a pull request that explains what changed and how you tested it.

## Ideas that fit

- A new world reached through a World Gate, with its own enemies, objective and boss
- A new rideable beast with two unique powers
- A new environment for the world-tier cycle
- Balance passes, accessibility options, controller support
