package repository

import (
	"context"
	"time"

	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type TelemetryRepository interface {
	UpsertCurrent(ctx context.Context, t *domain.Telemetry) error
	InsertHistory(ctx context.Context, t *domain.Telemetry) error
	GetCurrent(ctx context.Context, locomotiveID int) (*domain.Telemetry, error)
	GetHistory(ctx context.Context, locomotiveID int, from, to time.Time, limit int) ([]*domain.Telemetry, error)
	GetLimits(ctx context.Context, locomotiveID int) (*domain.TelemetryLimits, error)
	UpsertLimits(ctx context.Context, limits *domain.TelemetryLimits) error
}
