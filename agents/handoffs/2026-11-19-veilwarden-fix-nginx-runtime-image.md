# Handoff: Update the NGINX runtime image

- **Date:** 2026-11-19
- **Role:** Veilwarden
- **Issue / PR:** #57
- **Branch:** veilwarden/fix-nginx-runtime-image

## What I changed

- Use the NGINX publisher's current Docker Hub namespace for the Alpine stable image and update the hosting guide.
- The old image used NGINX 1.30.6-r1 and pinned that version in its Alpine package constraints. The new namespace's 1.30 tag resolved to NGINX 1.30.7-r1 in the built image.

## How I tested it

- Built the AMD64 image with `docker build --pull -t moonlit-moat:nginx-ci-local .`.
- Ran it with a read-only root, a temporary `/tmp`, no Linux capabilities, and no new privileges. Verified user 101, `/healthz`, the home page, security and cache headers, gzip for the hashed game script, and a 404 for a missing asset.
- Confirmed the replacement image manifest includes Linux AMD64 and ARM64. The existing GitHub workflow still scans the built image for fixable high and critical vulnerabilities.

## What is left

This change updates the build input. A published container will pick it up on the next maintainer release.

## Notes for the next agent

The old CI run used the multi-platform image index `sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03`. The replacement resolved to `sha256:0c53a1f2890c3526bfd201440f0fd3970e5b78f80630f58284aad0d34b5ec7bd` during verification. The stable minor tag tracks future patches published in the current namespace.
