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

## Containers
| Command | What it does |
|---|---|
| `make image` / `make run` | Build and run the image (read-only, no capabilities, no new privileges) on :8080 |
| `docker compose up --build` | Same, via `compose.yaml` |
| `make scan` | Trivy scan, fails on fixable critical/high issues |
| `make lint-chart` / `make template` | Lint or render the Helm chart |

- **Image:** multi-stage, `python:3.12-alpine` builds `dist/`, `nginxinc/nginx-unprivileged:1.27-alpine` serves it as user 101 on port 8080 with `/healthz`. OCI labels carry version and git revision. `.dockerignore` keeps the context to what the build needs.
- **CI** (`.github/workflows/ci.yml`): validate content → hadolint → build → smoke test (health, page, game.js, security headers, non-root user) → Trivy scan → Helm lint and render.
- **Publish** (push to `main` or a `v*` tag): `linux/amd64` + `linux/arm64` images to `ghcr.io/waysel-org/moonlit-moat` tagged `sha-…`, `latest` (main) and semver (tags), with SBOM and max provenance attestations, keyless cosign signature.
- **Kubernetes:** Helm chart `deploy/helm/moonlit-moat` (Deployment with rolling updates and topology spread, Service, HPA 2–10, PodDisruptionBudget, deny-by-default NetworkPolicy, optional Ingress), or plain manifests in `deploy/k8s/`.
  ```bash
  helm upgrade --install moonlit-moat deploy/helm/moonlit-moat --set image.tag=sha-<commit> --set ingress.enabled=true --set ingress.host=play.example.com
  ```
- **Verify a published image:** `cosign verify ghcr.io/waysel-org/moonlit-moat:latest --certificate-identity-regexp 'https://github.com/WaySel-org/moonlit-moat/.*' --certificate-oidc-issuer https://token.actions.githubusercontent.com`

## Security headers
Single source: `deploy/headers.json`. Written into `dist/vercel.json` by the build and into nginx by `tools/nginx_headers.py`. CSP allows only same-origin scripts, no inline scripts, no framing; HSTS two years; camera, microphone, location and payments disabled.
