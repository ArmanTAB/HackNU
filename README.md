# Locomotive Digital Twin

Real-time telemetry dashboard and health monitoring system for locomotive dispatchers and drivers. Built at HackNU hackathon (24h).

---

## Architecture

```
![arch_diagram.png](https://github.com/ArmanTAB/HackNU/raw/main/assets/arch_diagram.png)
```

---

## Tech Stack

| Layer       | Technology                   |
|-------------|------------------------------|
| Language    | Go 1.25                      |
| HTTP/WS     | Fiber v2 + gofiber/websocket |
| Message bus | Apache Kafka (kafka-go)      |
| Database    | PostgreSQL 16 (pgx/v5)       |
| Migrations  | golang-migrate               |
| Auth        | JWT (golang-jwt/jwt)         |
| Container   | Docker Compose               |
| Frontend    | React                        |  

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- `migrate` CLI — [install](https://github.com/golang-migrate/migrate/tree/master/cmd/migrate)

### 1. Clone and configure

```bash
git clone <repo-url>
cd HackNU/backend

cp .env.example .env
# Edit .env if needed (defaults work with Docker Compose out of the box)
```

### 2. Start the full stack

```bash
docker compose up -d
```

This starts:

| Service      | URL / Port                          |
|--------------|-------------------------------------|
| Backend API  | http://localhost:8081               |
| Kafka UI     | http://localhost:8090               |
| PostgreSQL   | localhost:5436                      |
| Kafka broker | localhost:19092                     |

The backend container automatically runs migrations and starts the simulator on startup.

### 3. Verify

```bash
curl http://localhost:8081/api/v1/healthz
# → {"status":"ok"}
```

---

## Running Without Docker

```bash
# Start infrastructure only
docker compose up postgres kafka -d

# Run migrations
migrate -path internal/infrastructure/db/migrations \
        -database "postgres://user:password@localhost:5436/locomotive_db?sslmode=disable" up

# Run backend with simulator
SIMULATOR_ENABLED=true go run ./cmd/server
```

### Build binary

```bash
go build -o bin/server ./cmd/server
./bin/server
```

---

## Test Locomotives

The built-in simulator generates realistic telemetry at 1 Hz for three locomotive profiles designed to showcase different health states:

| ID | Name | Type | Health | Description |
|----|------|------|--------|-------------|
| 1 | Healthy Electric | Electric | ~90 (green) | All sensors nominal. Rare, short warning blips every 2–3 minutes. Good baseline for normal operation. |
| 2 | Stressed Diesel | Diesel | ~45 (amber/red) | Fuel level ~18% (critical), oil pressure ~3.0 (warning), brake pipe ~4.0 (warning). Frequent critical alerts every 30–50 seconds. |
| 3 | Critical Electric | Electric | ~30 (red) | Brake pipe pressure 2.8 bar (critical), pantograph voltage 17 kV (critical, nominal ≥20 kV), inverter temp 95°C (critical). No additional anomalies — already in a failed state. |

### Simulator behavior

- **EMA smoothing** — values drift smoothly rather than jumping
- **Anomaly spikes** — locomotives 1 and 2 occasionally spike a parameter into warning/critical zone for a configurable duration
- **GPS route replay** — all three locomotives follow a real embedded GeoJSON route with live `gps_lat` / `gps_lon`
- **Frequency** — configurable via `SIMULATOR_HZ` (default: 1 message/sec per locomotive)

---

## Authentication

All data endpoints require a JWT Bearer token.

### Register

```bash
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "dispatcher1", "password": "secret"}'
```

### Login

```bash
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "dispatcher1", "password": "secret"}'
# Response: {"token": "<jwt>"}
```

Use the token in subsequent requests:

```
Authorization: Bearer <jwt>
```

---

## REST API Reference

Base URL: `http://localhost:8081/api/v1`

All endpoints except `/auth/*` require `Authorization: Bearer <token>`.

All timestamps are **ISO 8601 UTC**. All sensor values are `float64 | null`.

---

### Auth

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | `{username, password}` | Create account, returns JWT |
| POST | `/auth/login` | `{username, password}` | Authenticate, returns JWT |

---

### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Returns `{"status":"ok"}` if DB is reachable |

---

### Locomotives

| Method | Path | Description |
|--------|------|-------------|
| GET | `/locomotives` | List all locomotives with current health score |
| GET | `/locomotives/:id` | Single locomotive detail |

---

### Telemetry

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| GET | `/locomotives/:id/telemetry/current` | — | Latest telemetry snapshot |
| GET | `/locomotives/:id/telemetry/history` | `from`, `to` (RFC3339), `limit` (max 1000) | Historical time-series; defaults to last 1 hour |

---

### Limits (thresholds)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/locomotives/:id/limits` | Get all warning/critical thresholds for the locomotive |
| PUT | `/locomotives/:id/limits` | Update thresholds; takes effect immediately without restart |

---

### Health

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| GET | `/locomotives/:id/health/history` | `from`, `to` (RFC3339) | Health score snapshots (1 point/minute, downsampled); powers trend chart |

---

### Alerts

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| GET | `/locomotives/:id/alerts` | `active=true`, `severity=warning\|critical` | List alerts with optional filters |
| POST | `/locomotives/:id/alerts/:alert_id/acknowledge` | — | Acknowledge an alert |

Acknowledge body:
```json
{ "acknowledged_by": "dispatcher1" }
```

---

### Events

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| GET | `/locomotives/:id/events` | `from`, `to` (RFC3339) | List manual events (incidents, maintenance, notes) |
| POST | `/locomotives/:id/events` | — | Create a manual event |

Create event body:
```json
{
  "event_type": "incident",
  "description": "Driver reported unusual vibration",
  "created_by": "driver_42"
}
```

Supported `event_type` values: `incident`, `maintenance`, `note`, `replay_mark`.

---

### Export

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| GET | `/locomotives/:id/export/csv` | `from`, `to` (RFC3339) | Download telemetry history as CSV |

Example:
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8081/api/v1/locomotives/1/export/csv?from=2026-04-05T00:00:00Z&to=2026-04-05T01:00:00Z" \
  -o telemetry.csv
```

---

## WebSocket API

```
ws://localhost:8081/ws?locomotive_id=1
ws://localhost:8081/ws?locomotive_id=all   # dispatcher view — all locomotives
```

The JWT token must be passed as a query parameter `token=<jwt>` or `Authorization` header before the upgrade.

### Server → client message

```json
{
  "type": "telemetry",
  "locomotive_id": 1,
  "ts": "2026-04-05T10:00:00.000Z",
  "data": {
    "speed": 72.4,
    "engine_temp": 88.2,
    "fuel_level": 61.0,
    "oil_pressure": 4.2,
    "brake_pipe_pressure": 5.0,
    "gps_lat": 51.1801,
    "gps_lon": 71.4460
  },
  "health": 84.5,
  "alerts": [
    {
      "id": 42,
      "parameter": "engine_temp",
      "severity": "warning",
      "message": "engine_temp above warning threshold"
    }
  ]
}
```

### Keepalive

The server sends `{"type":"ping"}` every 30 seconds. If no pong is received within 60 seconds the connection is dropped. Implement exponential backoff on reconnect: 1s → 2s → 4s → max 30s.

---

## Health Index

Score range: **0–100** (higher = healthier).

| Score | Status | Color |
|-------|--------|-------|
| 80–100 | Normal | Green |
| 50–79 | Warning | Amber |
| 0–49 | Critical | Red |

The score is calculated from sensor readings weighted by parameter group, with active alert penalties applied (−2 per warning alert, −8 per critical alert, floor at 0).

---

## Configuration

Copy `.env.example` to `.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://user:password@localhost:5432/locomotive_db?sslmode=disable` | PostgreSQL connection string |
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka broker addresses |
| `KAFKA_TOPIC_TELEMETRY` | `telemetry.raw` | Topic for raw telemetry messages |
| `KAFKA_GROUP_ID` | `backend-consumer` | Consumer group ID |
| `PORT` | `8080` | HTTP server port |
| `WS_PATH` | `/ws` | WebSocket endpoint path |
| `HEALTH_SNAPSHOT_INTERVAL` | `5` | Seconds between health snapshot writes |
| `SIMULATOR_ENABLED` | `false` | Enable built-in telemetry simulator |
| `SIMULATOR_LOCOMOTIVE_IDS` | `1,2,3` | Comma-separated IDs to simulate |
| `SIMULATOR_HZ` | `1` | Messages per second per locomotive |
| `JWT_SECRET` | — | Secret key for signing JWT tokens |
| `JWT_EXPIRY_HOURS` | `720` | Token expiry in hours (default 30 days) |

---

## Project Structure

```
backend/
├── cmd/server/main.go                   # Entry point: bootstrap, DI, graceful shutdown
├── internal/
│   ├── app/app.go                       # Application assembly
│   ├── config/config.go                 # Env var parsing
│   ├── domain/                          # Core domain models
│   ├── service/                         # Business logic
│   ├── repository/                      # Repository interfaces
│   ├── infrastructure/
│   │   ├── db/                          # PostgreSQL pool + migrations
│   │   ├── repository/                  # PostgreSQL implementations
│   │   ├── kafka/                       # Producer / consumer
│   │   └── ws/hub.go                    # WebSocket hub
│   ├── transport/http/                  # Fiber HTTP handlers + router
│   ├── health/calculator.go             # Health index formula
│   └── simulator/simulator.go           # Mock telemetry generator
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── go.mod
```

---

## Development

```bash
# Run tests
go test ./...

# Kafka UI (browse topics, inspect messages)
open http://localhost:8090
```

### Useful Kafka commands

```bash
# List topics
docker exec locomotive-kafka kafka-topics.sh \
  --bootstrap-server localhost:29092 --list

# Tail telemetry messages live
docker exec locomotive-kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:29092 \
  --topic telemetry.raw --from-beginning
```
