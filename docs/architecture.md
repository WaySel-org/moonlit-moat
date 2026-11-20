# Architecture

## Shape of the code
```
content/ (JSON data)  ─┐
src/systems/** (code) ─┼─ tools/build.py ─► dist/ ─┬─► Vercel CDN (play.waysel.com)
src/index.html, styles ┘   validate, assemble       ├─► container image (nginx, /healthz) ─► any Kubernetes / Cloud Run / ECS
                                                     └─► local: python3 -m http.server
```

- **Systems** (`src/systems/`) are plain scripts grouped by domain: `core`, `render`, `ui`, `world/<world>`, `actors/<kind>`. `manifest.json` fixes the order; the build concatenates them inside one closure, so systems share scope. This keeps the original game behaviour exactly while letting people work on one file at a time.
- **Content** (`content/`) has one JSON file per character and world, plus `environments.json`. The build validates each file and bundles it as `window.MM_CONTENT`. `core/48-content.js` applies mount, creep and environment data over the code defaults. Bosses and world layouts are still built in code.
- **Rendering** draws the scene to a texture and uses a gameplay mask to keep actors bright in the glyph shader. Rigid friendly and hostile objects use layers 1 and 2. Skinned objects share layer 3 and draw in the current pose with their own friendly or hostile mask color.
- **Render passes** share one world-matrix update of visible scene branches after simulation and camera updates. The reflection moves the sky and restores it before the next pass. The main pass updates the moon and torch transforms just before rendering shadows. Enhanced bloom runs in Raw and Split views.

## Delivery (cloud native)
- **Stateless and static.** The whole game is static files; any number of replicas can serve it. No server state, no database, no secrets.
- **One header policy.** `deploy/headers.json` is the single source for security headers; the build writes it into `vercel.json` and the container's nginx config.
- **Container.** Multi-stage `Dockerfile`: Python builds `dist/`, unprivileged nginx serves it on port 8080 with `/healthz`. Runs read-only, non-root, all capabilities dropped (`deploy/k8s/deployment.yaml`).
- **Scaling.** Kubernetes manifest ships a Deployment (2 replicas), Service and HorizontalPodAutoscaler (2–10 replicas at 70% CPU). On Vercel, the CDN scales automatically.
- **CI/CD.** `.github/workflows/ci.yml` builds and validates every pull request and builds the image; pushes to `main` publish `ghcr.io/waysel-org/moonlit-moat:{sha,latest}`. Production deploys to play.waysel.com stay manual (Veilwarden).

## Adding backend services later
The game is single-player and offline-capable today. If it grows saves, leaderboards or shared worlds:
- Put each concern in its own stateless service under `services/<name>/` with its own Dockerfile and manifest (for example `services/leaderboard`).
- Keep the client static; call services over HTTPS at a same-origin path (`/api/...`) so the CSP `connect-src 'self'` still holds.
- Store state in a managed database; never in the game container.
- Add opt-in only, privacy-first telemetry, if any.

## Roadmap for the code
1. Land the multi-world system (worlds as groups, travel, story switches, rift storms).
2. Move world layouts and bosses into `content/` so map changes need no code.
3. Convert systems to ES modules with explicit imports, then bundle with esbuild.
4. Add automated smoke tests (headless load, no console errors) to CI.
