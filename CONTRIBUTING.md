# Contributing to Moonlit Moat

Moonlit Moat is built never to be finished. New worlds, creatures, rules and fixes keep it growing, and every contribution should create a moment worth remembering.

## Before you start
1. Read the canon in [lore/README.md](lore/README.md).
2. Find the role that owns what you want to change in [agents/README.md](agents/README.md). Humans use the same roles as agents; it tells you whose files you are touching.
3. Open or claim an issue (templates: new world, new character, bug).

## Ground rules
- **Original only.** No characters, names, designs or plots from existing games, films, shows or books. Myth and folklore are fine.
- **Readable ASCII.** Tag anything the player fights or collects into the gameplay mask (`tag(obj, 1)` friendly, `tag(obj, 2)` hostile).
- **Secure.** No outside scripts, trackers or network calls. Don't loosen `deploy/headers.json`.
- **Playable.** No console errors, 50+ fps on a normal laptop.

## Easiest ways in
- **Tune a creature or mount:** edit its file in `content/characters/`. Mount stats and powers, creep names and health, and environments take effect on the next build without code.
- **Add an environment:** add an entry to `content/environments.json` and the matching entry in `src/systems/world/32-environments.js`.
- **Add a world:** copy a Shardkeeper role, write `content/worlds/<id>/world.json`, ask the Loremaster for a chapter, and add your systems under `src/systems/world/<id>/` (listed in `manifest.json`).

## Making a change
```bash
python3 tools/build.py                          # validates content and syntax-checks the game
python3 -m http.server 8765 --directory dist    # play it
```
Open a pull request with the template. CI must pass. Add a handoff note in `agents/handoffs/` if someone else may continue your work.
