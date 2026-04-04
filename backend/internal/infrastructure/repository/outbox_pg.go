package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type OutboxPg struct {
	db *pgxpool.Pool
}

func NewOutboxPg(db *pgxpool.Pool) *OutboxPg {
	return &OutboxPg{db: db}
}

func (r *OutboxPg) InsertTx(ctx context.Context, tx pgx.Tx, e *domain.OutboxEntry) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
		VALUES ($1, $2, $3, $4)
	`, e.AggregateType, e.AggregateID, e.EventType, e.Payload)
	if err != nil {
		return fmt.Errorf("outbox_pg.InsertTx: %w", err)
	}
	return nil
}

func (r *OutboxPg) FetchUnprocessed(ctx context.Context, limit int) ([]*domain.OutboxEntry, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("outbox_pg.FetchUnprocessed begin: %w", err)
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
		SELECT id, created_at, aggregate_type, aggregate_id, event_type, payload
		FROM outbox
		WHERE processed = FALSE
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("outbox_pg.FetchUnprocessed query: %w", err)
	}
	defer rows.Close()

	var entries []*domain.OutboxEntry
	for rows.Next() {
		e := &domain.OutboxEntry{}
		if err := rows.Scan(&e.ID, &e.CreatedAt, &e.AggregateType, &e.AggregateID, &e.EventType, &e.Payload); err != nil {
			return nil, fmt.Errorf("outbox_pg.FetchUnprocessed scan: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("outbox_pg.FetchUnprocessed rows: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("outbox_pg.FetchUnprocessed commit: %w", err)
	}
	return entries, nil
}

func (r *OutboxPg) MarkProcessed(ctx context.Context, ids []int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE outbox SET processed = TRUE, processed_at = NOW()
		WHERE id = ANY($1)
	`, ids)
	if err != nil {
		return fmt.Errorf("outbox_pg.MarkProcessed: %w", err)
	}
	return nil
}
