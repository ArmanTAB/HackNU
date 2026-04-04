package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type OutboxRepository interface {
	InsertTx(ctx context.Context, tx pgx.Tx, entry *domain.OutboxEntry) error
	FetchUnprocessed(ctx context.Context, limit int) ([]*domain.OutboxEntry, error)
	MarkProcessed(ctx context.Context, ids []int64) error
}
