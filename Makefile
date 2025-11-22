DC := docker compose

.PHONY: install watch up down build logs backend-shell frontend-shell lint test coverage audit-force

install:
	$(DC) build
	$(DC) run --rm backend npm install
	$(DC) run --rm frontend npm install

watch:
	$(DC) up backend frontend

up:
	$(DC) up --build

down:
	$(DC) down

build:
	$(DC) build

logs:
	$(DC) logs -f

backend-shell:
	$(DC) exec backend sh

frontend-shell:
	$(DC) exec frontend sh

lint:
	$(DC) run --rm backend npm run lint
	$(DC) run --rm frontend npm run lint

test:
	$(DC) run --rm backend npm run test
	$(DC) run --rm frontend npm run test

coverage:
	$(DC) run --rm backend npm run test:coverage
	$(DC) run --rm frontend npm run test:coverage

audit-force:
	$(DC) run --rm backend npm audit fix --force || true
	$(DC) run --rm frontend npm audit fix --force || true
