IMAGE ?= ghcr.io/waysel-org/moonlit-moat
TAG   ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo dev)
CHART := deploy/helm/moonlit-moat

.PHONY: build serve image run compose scan lint-chart template deploy-vercel clean

build:            ## Validate content and assemble dist/
	python3 tools/build.py

serve: build      ## Play locally at http://localhost:8765
	python3 -m http.server 8765 --directory dist

image:            ## Build the container image
	docker build --build-arg VERSION=$(TAG) --build-arg REVISION=$(TAG) -t $(IMAGE):$(TAG) -t moonlit-moat:local .

run: image        ## Run the container at http://localhost:8080 (read-only, no capabilities)
	docker run --rm -p 8080:8080 --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges $(IMAGE):$(TAG)

compose:          ## Same, via docker compose
	docker compose up --build

scan: image       ## Vulnerability scan (needs trivy)
	trivy image --severity CRITICAL,HIGH --ignore-unfixed --exit-code 1 $(IMAGE):$(TAG)

lint-chart:       ## Lint the Helm chart (needs helm)
	helm lint $(CHART)

template:         ## Render the Helm chart to stdout
	helm template moonlit-moat $(CHART)

deploy-vercel: build  ## Production deploy to play.waysel.com (maintainers only)
	cd dist && vercel deploy --prod

clean:
	rm -rf dist/game.js dist/content.js dist/index.html dist/styles.css dist/vendor dist/healthz dist/vercel.json
