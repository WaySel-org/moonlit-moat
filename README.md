# Moonlit Moat

**WaySel's first open-source game.** An action RPG drawn entirely in text characters, played in the browser.

Play it: **https://play.waysel.com**

Moonlit Moat has no ending and no fixed story. The world keeps changing: tiers rise every two minutes, the hedge maze reshuffles, environments shift from Blood Moon to Aurora, the Warden hunts you, and the Veil opens onto a spirit realm. Every run carries a storyline of its own, made from what you fight, tame, find and survive. The project is meant to grow the same way: anyone can add a world, a beast, a boss or a rule, and the game keeps going.

## How it looks

A normal 3D scene is rendered every frame, then a shader turns it into characters. Each screen cell is measured for brightness and replaced with a glyph from ` .:-=+*#%`, with `| - / \` along strong edges. Gameplay objects are drawn on a separate mask so they stay bright and readable against quieter scenery.

## Controls

| Key | Action |
|---|---|
| WASD / arrows | Move |
| J or click | Light attack (three-hit combo) |
| K | Heavy attack |
| Space | Roll (brief invulnerability) |
| Shift | Block; tap just before a hit to parry |
| Z / C / V / X | Dagger, moon bolt, arc volley, leap |
| F | Drink a flask |
| E | Open chests, use the shrine, ride beasts |
| Q | Enter or leave the spirit realm |
| R / T | Lock on / switch target |
| P / M | Hero sheet / map |
| Esc | Pause |

## Run it locally

You need Python 3.

```bash
python3 build-local.py
python3 -m http.server 8765 --directory moonlit-moat
```

Then open http://localhost:8765.

## Project layout

| Path | What it is |
|---|---|
| `moonlit-moat.html` | The whole game: markup, styles and code in one file |
| `build-local.py` | Splits it into `index.html` + `game.js`, bundles three.js and writes strict security headers into `vercel.json` |
| `vendor-dl/three.min.js` | three.js r128 (MIT), bundled so no outside script host is needed |
| `moonlit-moat/` | Build output (not committed) |

## Contributing

Ideas, worlds, creatures, bug fixes and balance changes are all welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Code: [MIT](LICENSE). three.js is © the three.js authors, also MIT; see [THIRD_PARTY.md](THIRD_PARTY.md).

All characters, creatures and places in the game are original. Please keep contributions original too.
