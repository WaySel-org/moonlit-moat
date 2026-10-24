# CLAUDE.md

Read [AGENTS.md](AGENTS.md) first; it is the shared guide for every agent, Claude or otherwise.

Project-specific notes for Claude sessions:
- Owner: Wasay (WaySel). He uses the Claude desktop app only, so point to app UI, never terminal-only Claude commands.
- This folder (`~/Claude Docs/moonlit-moat`) is the isolated home of the project and a clone of https://github.com/WaySel-org/moonlit-moat. Nothing here depends on other folders.
- Local play: the app's preview config `moonlit-moat` (in `.claude/launch.json`) serves `dist/` on port 8765. Run `python3 tools/build.py` first.
- Deploy to play.waysel.com only when Wasay asks: `cd dist && vercel deploy --prod` (the `dist/.vercel` link is kept across builds and never committed).
- Push to `main` only when Wasay asks; otherwise use a branch and a pull request.
- History of how the game was built: [docs/history.md](docs/history.md). Open work: [docs/roadmap.md](docs/roadmap.md).
