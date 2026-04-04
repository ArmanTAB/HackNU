package repository

import (
	"context"

	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type UserRepository interface {
	Create(ctx context.Context, login, passwordHash string) (*domain.User, error)
	FindByLogin(ctx context.Context, login string) (*domain.User, error)
}
