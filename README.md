# Moonlit Moat

**WaySel's first open-source game.** An endless action RPG drawn entirely in text characters, played in the browser.

Play it: **https://play.waysel.com**

Reality has been sundered into shards, and each shard is a world. Moonlit Moat has no ending and no fixed script: tiers rise every two minutes, the hedge maze reshuffles, environments turn from Blood Moon to Aurora, the Warden hunts you, and the Veil opens onto a spirit realm. Every run carries a storyline of its own. The project grows the same way: anyone can add a world, a creature or a rule. Read the canon in [lore/](lore/README.md).

## For contributors and their agents
- **Humans:** start with [CONTRIBUTING.md](CONTRIBUTING.md).
- **AI agents:** start with [AGENTS.md](AGENTS.md), then pick a role in [agents/roles/](agents/roles/). Roles follow the story: Shardkeepers for each world, plus the Loremaster, Gatewright, Bestiary Keeper and Veilwarden.

## Repository layout
| Path | What it is |
|---|---|
| `src/systems/` | Game code, one file per system, grouped as `core`, `render`, `ui`, `world/<world>`, `actors/<kind>` |
| `content/` | Data: one JSON per character, one `world.json` per world, `environments.json` |
| `lore/` | The canon and one chapter per world |
| `agents/` | Agent roles, the coordination protocol, handoff notes |
| `tools/` | `build.py` (validate + assemble), `split.py` (fold a single-file version back into the tree) |
| `deploy/`, `Dockerfile` | Security headers, nginx, Kubernetes manifests |
| `docs/` | Architecture, hosting, roadmap, history |

## Run it
```bash
python3 tools/build.py
python3 -m http.server 8765 --directory dist      # http://localhost:8765
```
Or in a container:
```bash
docker build -t moonlit-moat .
docker run --rm -p 8080:8080 moonlit-moat        # http://localhost:8080, health at /healthz
```

## How it looks
A normal 3D scene renders every frame, then a shader replaces each screen cell with a character by brightness (` .:-=+*#%`, with `| - / \` on strong edges). A separate gameplay mask keeps heroes, enemies and pickups bright while scenery recedes. See [docs/architecture.md](docs/architecture.md).

## Controls
| Key | Action |
|---|---|
| WASD / arrows | Move |
| J or click / K | Light combo / heavy attack |
| Space | Roll |
| Shift | Block (tap just before a hit to parry) |
| Z / C / V / X | Dagger, moon bolt, arc volley, leap (mounted: the beast's powers) |
| F | Flask |
| E | Chests, shrine, ride beasts |
| Q | Spirit realm |
| R / T | Lock on / switch target |
| P / M | Hero sheet / map |
| Esc | Pause |

## License
Code: [MIT](LICENSE). three.js and IBM Plex Mono: see [THIRD_PARTY.md](THIRD_PARTY.md). Everything in the game is original; keep contributions original too.
