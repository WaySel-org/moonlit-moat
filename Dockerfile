# Moonlit Moat: static game served by unprivileged nginx.
# Build:  docker build -t moonlit-moat .
# Run:    docker run --rm -p 8080:8080 moonlit-moat   ->  http://localhost:8080  (health: /healthz)

FROM python:3.12-alpine AS build
WORKDIR /app
COPY tools ./tools
COPY src ./src
COPY content ./content
COPY vendor ./vendor
COPY deploy ./deploy
RUN python3 tools/build.py && python3 tools/nginx_headers.py > /security-headers.conf

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
