# Roadmap

## In progress
- **Multi-world storyline ("The Sundering")**, Gatewright with the Shardkeepers of Veyra, Neon Verge and Ashfall. Being built by an agent against the earlier single-file version on branch `multi-world` (in the old working copy). When it lands it is folded into this tree with `python3 tools/split.py <merged single file>`, then reviewed before release.
  - Story switches on chapter completion, World Gates to revisit, rare rift storms (35% every 5 min, 75 s).

## Next
- **Plug and play**: click the link, land in a live world with no menus, panels or loading screen; offline-first delivery; phone and tablet controls. Plan in [plug-and-play.md](plug-and-play.md) (Gatewright, Veilwarden).
- Move world layouts and bosses from code into `content/` (Gatewright).
- Smoke test in CI: headless load with no console errors (Veilwarden).
- Convert systems to ES modules with explicit imports (Gatewright).

## Not yet released to play.waysel.com
- The spirit realm, spirit enemies, godlings, souls, the map, and this restructure.

## Ideas welcome
- New worlds and Shardkeepers, more mounts and environments, accessibility and controller support, balance passes.
