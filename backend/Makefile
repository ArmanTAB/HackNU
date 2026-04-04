.PHONY: up down infra infra-down build run run-no-sim logs logs-backend logs-kafka ps clean swag psql migrate-up migrate-down test bin

# ── Full stack ────────────────────────────────────────────────────────────────

## Start everything (build backend image first)
up: build
	docker compose up -d
## Stop and remove containers
down:
	docker compose down

## Stop and remove containers + volumes (wipes DB data)
clean:
	docker compose down -v

# ── Infra only (for local dev with `go run`) ─────────────────────────────────

## Start postgres + kafka + kafka-ui only (no backend container)
infra:
	docker compose up -d postgres kafka kafka-init kafka-ui

## Stop infra containers
infra-down:
	docker compose stop postgres kafka kafka-init kafka-ui

# ── Backend ───────────────────────────────────────────────────────────────────

## Build backend Docker image
build:
	docker compose build --no-cache backend

## Run backend locally with simulator (requires `make infra` first)
run:
	SIMULATOR_ENABLED=true go run ./cmd/server

## Run backend locally without simulator
run-no-sim:
	go run ./cmd/server

# ── Observability ─────────────────────────────────────────────────────────────

## Tail all logs
logs:
	docker compose logs -f

## Tail backend logs only
logs-backend:
	docker compose logs -f backend

## Tail kafka logs only
logs-kafka:
	docker compose logs -f kafka

## Show running containers
ps:
	docker compose ps

# ── Swagger ───────────────────────────────────────────────────────────────────

## Regenerate Swagger docs (requires swag: go install github.com/swaggo/swag/cmd/swag@latest)
swag:
	swag init -g cmd/server/main.go -o docs

# ── Database ──────────────────────────────────────────────────────────────────

## Open psql shell inside postgres container
psql:
	docker compose exec postgres psql -U user -d locomotive_db

## Run migrations manually (set DATABASE_URL env first)
migrate-up:
	migrate -path internal/infrastructure/db/migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path internal/infrastructure/db/migrations -database "$(DATABASE_URL)" down

# ── Go ────────────────────────────────────────────────────────────────────────

## Run tests
test:
	go test ./...

## Build binary to bin/server
bin:
	go build -o bin/server ./cmd/server
