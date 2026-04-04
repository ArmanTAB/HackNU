package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type EventPg struct {
	db *pgxpool.Pool
}

func NewEventPg(db *pgxpool.Pool) *EventPg {
	return &EventPg{db: db}
}

func (r *EventPg) Insert(ctx context.Context, e *domain.Event) (int64, error) {
	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO events (locomotive_id, ts, event_type, description, created_by, telemetry_snapshot)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, e.LocomotiveID, e.Ts, e.EventType, e.Description, e.CreatedBy, e.TelemetrySnapshot).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("event_pg.Insert: %w", err)
	}
	return id, nil
}

func (r *EventPg) GetByLocomotive(ctx context.Context, locomotiveID int, from, to time.Time) ([]*domain.Event, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, locomotive_id, ts, event_type, description, created_by, telemetry_snapshot
		FROM events
		WHERE locomotive_id=$1 AND ts BETWEEN $2 AND $3
		ORDER BY ts DESC
	`, locomotiveID, from, to)
	if err != nil {
		return nil, fmt.Errorf("event_pg.GetByLocomotive: %w", err)
	}
	defer rows.Close()

	var events []*domain.Event
	for rows.Next() {
		ev := &domain.Event{}
		if err := rows.Scan(&ev.ID, &ev.LocomotiveID, &ev.Ts, &ev.EventType,
			&ev.Description, &ev.CreatedBy, &ev.TelemetrySnapshot); err != nil {
			return nil, fmt.Errorf("event_pg.GetByLocomotive scan: %w", err)
		}
		events = append(events, ev)
	}
	return events, rows.Err()
}
