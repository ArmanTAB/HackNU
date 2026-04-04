.PHONY: up down infra infra-down build run run-no-sim logs logs-backend logs-kafka ps clean swag psql migrate-up migrate-down test bin

# ── Full stack ────────────────────────────────────────────────────────────────

## Start everything
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