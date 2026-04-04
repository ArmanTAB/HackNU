FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o bin/server ./cmd/server

FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/bin/server .
COPY --from=builder /app/internal/infrastructure/db/migrations ./internal/infrastructure/db/migrations

EXPOSE 8080

CMD ["./server"]
