package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type AlertRepository interface {
	Insert(ctx context.Context, a *domain.Alert) (int64, error)
	InsertTx(ctx context.Context, tx pgx.Tx, a *domain.Alert) (int64, error)
	GetByLocomotive(ctx context.Context, locomotiveID int, activeOnly bool, severity string) ([]*domain.Alert, error)
	Acknowledge(ctx context.Context, alertID int64, acknowledgedBy string) error
	HasActiveAlert(ctx context.Context, locomotiveID int, parameterName, severity string) (bool, error)
	HasActiveAlertTx(ctx context.Context, tx pgx.Tx, locomotiveID int, parameterName, severity string) (bool, error)
	GetActiveCount(ctx context.Context, locomotiveID int, severity string) (int, error)
}
