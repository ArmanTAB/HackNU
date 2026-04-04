package repository

import (
	"context"
	"time"

	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type EventRepository interface {
	Insert(ctx context.Context, e *domain.Event) (int64, error)
	GetByLocomotive(ctx context.Context, locomotiveID int, from, to time.Time) ([]*domain.Event, error)
}
