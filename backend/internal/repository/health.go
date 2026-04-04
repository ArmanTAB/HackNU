package repository

import (
	"context"
	"time"

	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type HealthRepository interface {
	InsertSnapshot(ctx context.Context, s *domain.HealthSnapshot) error
	GetSnapshots(ctx context.Context, locomotiveID int, from, to time.Time) ([]*domain.HealthSnapshot, error)
}
