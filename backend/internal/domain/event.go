package domain

import (
	"encoding/json"
	"time"
)

type Event struct {
	ID                int64           `json:"id"`
	LocomotiveID      int             `json:"locomotive_id"`
	Ts                time.Time       `json:"ts"`
	EventType         string          `json:"event_type"` // incident | maintenance | note | replay_mark
	Description       string          `json:"description"`
	CreatedBy         string          `json:"created_by"`
	TelemetrySnapshot json.RawMessage `json:"telemetry_snapshot,omitempty" swaggertype:"object"`
}
