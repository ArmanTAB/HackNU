package domain

import (
	"encoding/json"
	"time"
)

type OutboxEntry struct {
	ID            int64
	CreatedAt     time.Time
	AggregateType string
	AggregateID   int
	EventType     string
	Payload       json.RawMessage
	Processed     bool
	ProcessedAt   *time.Time
}
