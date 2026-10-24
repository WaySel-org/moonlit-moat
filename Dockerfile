# syntax=docker/dockerfile:1.7
# Moonlit Moat: static game served by unprivileged nginx.
#   make image && make run        ->  http://localhost:8080   (health: /healthz)

ARG PYTHON_IMAGE=python:3.12-alpine
# 1.30 is nginx's current stable branch; 1.27 is retired and frozen on an unpatched Alpine.
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.30-alpine

# ---- build: validate content and assemble dist/ (no network, no extra packages)
FROM ${PYTHON_IMAGE} AS build
WORKDIR /app
COPY tools ./tools
COPY src ./src
COPY content ./content
COPY vendor ./vendor
COPY deploy/headers.json deploy/cache.json ./deploy/
RUN python3 tools/build.py \
 && python3 tools/nginx_headers.py > /security-headers.conf \
 && python3 tools/nginx_headers.py cache assets > /cache-assets.conf \
 && python3 tools/nginx_headers.py cache default > /cache-default.conf \
 && rm -rf dist/.vercel

# ---- runtime: unprivileged nginx, read-only friendly, port 8080
FROM ${NGINX_IMAGE}
ARG VERSION=dev
ARG REVISION=unknown
LABEL org.opencontainers.image.title="Moonlit Moat" \
      org.opencontainers.image.description="WaySel's open-source endless ASCII action RPG" \
      org.opencontainers.image.url="https://play.waysel.com" \
      org.opencontainers.image.source="https://github.com/WaySel-org/moonlit-moat" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="WaySel" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"
# Pick up Alpine security fixes published since the base image was built, then drop back to the unprivileged user.
USER root
RUN apk upgrade --no-cache
USER 101
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /security-headers.conf /cache-assets.conf /cache-default.conf /etc/nginx/snippets/
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
