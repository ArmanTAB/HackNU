package repository

import (
	"context"

	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type AlertRepository interface {
	Insert(ctx context.Context, a *domain.Alert) (int64, error)
	GetByLocomotive(ctx context.Context, locomotiveID int, activeOnly bool, severity string) ([]*domain.Alert, error)
	Acknowledge(ctx context.Context, alertID int64, acknowledgedBy string) error
	HasActiveAlert(ctx context.Context, locomotiveID int, parameterName, severity string) (bool, error)
	GetActiveCount(ctx context.Context, locomotiveID int, severity string) (int, error)
}
