package repository

import (
	"context"

	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type LocomotiveRepository interface {
	GetAll(ctx context.Context) ([]*domain.Locomotive, error)
	GetByID(ctx context.Context, id int) (*domain.Locomotive, error)
	Create(ctx context.Context, l *domain.Locomotive) (int, error)
	Update(ctx context.Context, l *domain.Locomotive) error
	Delete(ctx context.Context, id int) error
}
