# Hosting and release

Owner role: **Veilwarden**.

## Build
```bash
python3 tools/build.py      # validates content, assembles dist/, syntax-checks game.js
```

## Local
- `python3 -m http.server 8765 --directory dist`, or the Claude app preview config `moonlit-moat` in `.claude/launch.json`.
- Container: `docker build -t moonlit-moat . && docker run --rm -p 8080:8080 moonlit-moat` (health: `/healthz`).

## Production: play.waysel.com (Vercel)
- Vercel project `moonlit-moat` on the `waysel` account. The link lives in `dist/.vercel/` (kept across builds, never committed).
- Deploy only when the maintainers ask: `python3 tools/build.py && cd dist && vercel deploy --prod`.
- Domain play.waysel.com is attached to the project. waysel.com DNS is on Vercel; a wildcard already points there, so no records were added. Remove with `vercel domains rm play.waysel.com`.

## Container image
- CI publishes `ghcr.io/waysel-org/moonlit-moat:{sha,latest}` on every push to `main`.
- `deploy/k8s/deployment.yaml` runs it with 2–10 replicas, health probes, non-root, read-only filesystem.

## Security headers
Single source: `deploy/headers.json`. Written into `dist/vercel.json` by the build and into nginx by `tools/nginx_headers.py`. CSP allows only same-origin scripts, no inline scripts, no framing; HSTS two years; camera, microphone, location and payments disabled.
