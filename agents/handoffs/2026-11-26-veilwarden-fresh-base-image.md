# Handoff: CI always pulls a fresh nginx base image

- **Date:** 2026-11-26
- **Role:** Veilwarden
- **Issue / PR:** see the PR for branch `veilwarden/fresh-base-image`
- **Branch:** veilwarden/fresh-base-image

## What I changed
- `.github/workflows/ci.yml`: `pull: true` on both `docker/build-push-action` steps (the container check and the publish job).

## Why
The container job on PR #66 failed its Trivy scan with 4 critical and 2 high nginx CVEs (nginx 1.30.6-r1, fixed in 1.30.7-r0). The Dockerfile already follows the floating `nginx/nginx-unprivileged:1.30-alpine` tag, which now ships 1.30.8, but the build still produced 1.30.6, most likely from the GitHub Actions build cache. `apk upgrade` in the Dockerfile cannot fix this: nginx comes from nginx.org's repo, not Alpine's. With `pull: true` every build re-resolves the base tag, so a patched base image is used as soon as it is published.

## How I tested it
No Docker on the machine I worked from, so the proof is this PR's own CI run: the container job builds, smoke-tests and scans the image.

## What is left
- No Dependabot or Renovate is set up. Adding one for `docker` and `github-actions` would flag base image and action updates automatically.

## Notes for the next agent
Do not pin the nginx image to an exact digest unless an update bot is added too, or the next nginx fix will be missed silently.
