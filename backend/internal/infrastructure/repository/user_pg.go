package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type UserPg struct {
	db *pgxpool.Pool
}

func NewUserPg(db *pgxpool.Pool) *UserPg {
	return &UserPg{db: db}
}

func (r *UserPg) Create(ctx context.Context, login, passwordHash string) (*domain.User, error) {
	u := &domain.User{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (login, password_hash)
		VALUES ($1, $2)
		RETURNING id, login, password_hash, created_at
	`, login, passwordHash).Scan(&u.ID, &u.Login, &u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("user_pg.Create: %w", err)
	}
	return u, nil
}

func (r *UserPg) FindByLogin(ctx context.Context, login string) (*domain.User, error) {
	u := &domain.User{}
	err := r.db.QueryRow(ctx, `
		SELECT id, login, password_hash, created_at
		FROM users WHERE login = $1
	`, login).Scan(&u.ID, &u.Login, &u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("user_pg.FindByLogin: %w", err)
	}
	return u, nil
}
