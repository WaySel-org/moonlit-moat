# AGENTS.md — start here if you are an AI agent

You are contributing to **Moonlit Moat**, WaySel's open-source, endless, ASCII-rendered action RPG.
Humans and agents work side by side here. This file tells you how to find your way, pick a role, and hand work back cleanly.

## 1. Read in this order
1. This file.
2. [lore/README.md](lore/README.md): the canon. The story never ends; your work must fit it.
3. [agents/README.md](agents/README.md): how agents coordinate (claiming work, branches, handoffs).
4. Your role in [agents/roles/](agents/roles/). Pick the one that owns the files you will touch.
5. [docs/architecture.md](docs/architecture.md) if you touch code.

## 2. Repository map
| Path | What lives there | Owner role |
|---|---|---|
| `src/systems/core/` | bootstrap, game state, content loader, input, pause, loop, sound | Gatewright |
| `src/systems/render/` | lights, sky, ASCII pass, gameplay mask, effects | Gatewright |
| `src/systems/ui/` | HUD, minimap, renderer controls | Gatewright |
| `src/systems/world/moat/` | the moat world: castle, lake, maze, keeps, chests, shrine | Shardkeeper of the Moat |
| `src/systems/world/spirit/` | the spirit realm | Shardkeeper of the Veil |
| `src/systems/world/environments.js` | world-tier environment cycle | Shardkeeper of the Moat |
| `src/systems/actors/` | player, bosses, creeps, mounts | Bestiary Keeper (player: Gatewright) |
| `src/systems/manifest.json` | the order systems are assembled in | Gatewright |
| `src/index.html`, `src/styles/` | markup and styles | Gatewright |
| `content/characters/**` | one JSON file per character | Bestiary Keeper |
| `content/worlds/<id>/world.json` | one map file per world | that world's Shardkeeper |
| `content/environments.json` | environment cycle data | Shardkeeper of the Moat |
| `lore/` | canon, chapters | Loremaster |
| `deploy/`, `Dockerfile`, `.github/workflows/` | hosting, security headers, CI/CD | Veilwarden |
| `tools/` | build and split tooling | Gatewright |

## 3. Commands
```bash
python3 tools/build.py                                   # validate content, assemble dist/, syntax-check
python3 -m http.server 8765 --directory dist             # play at http://localhost:8765
docker build -t moonlit-moat . && docker run --rm -p 8080:8080 moonlit-moat   # container, health at /healthz
```

## 4. Rules that are never negotiable
- **Original only.** No characters, names, designs or story from existing games, films, shows or books. Myth and folklore are fine; franchise versions are not. Every content file declares `"originality": "original"`.
- **Readable ASCII.** Anything the player fights or collects must be tagged into the gameplay mask: `tag(obj, 1)` friendly, `tag(obj, 2)` hostile (see `render/36-gameplay-mask.js`).
- **Secure by default.** No outside scripts, trackers or network calls. Headers come from `deploy/headers.json`; do not loosen them.
- **No silent behaviour changes.** Content files set values the game already uses; if you change a number, say so in your PR.
- **Build stays green.** `python3 tools/build.py` must pass and the game must load with no console errors.

## 5. Handing work back
Open a pull request using the template, link the issue you claimed, and add a handoff note in `agents/handoffs/` (template there). Never push to `main` directly and never deploy; the Veilwarden and the maintainers release.
