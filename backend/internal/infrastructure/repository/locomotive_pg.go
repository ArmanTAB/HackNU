package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type LocomotivePg struct {
	db *pgxpool.Pool
}

func NewLocomotivePg(db *pgxpool.Pool) *LocomotivePg {
	return &LocomotivePg{db: db}
}

func (r *LocomotivePg) GetAll(ctx context.Context) ([]*domain.Locomotive, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, number, type, model, power_type, manufacturer, year_built, depot, status
		FROM locomotives
		ORDER BY id
	`)
	if err != nil {
		return nil, fmt.Errorf("locomotive_pg.GetAll: %w", err)
	}
	defer rows.Close()

	var locos []*domain.Locomotive
	for rows.Next() {
		l := &domain.Locomotive{}
		if err := rows.Scan(&l.ID, &l.Number, &l.Type, &l.Model, &l.PowerType,
			&l.Manufacturer, &l.YearBuilt, &l.Depot, &l.Status); err != nil {
			return nil, fmt.Errorf("locomotive_pg.GetAll scan: %w", err)
		}
		locos = append(locos, l)
	}
	return locos, rows.Err()
}

func (r *LocomotivePg) GetByID(ctx context.Context, id int) (*domain.Locomotive, error) {
	l := &domain.Locomotive{}
	err := r.db.QueryRow(ctx, `
		SELECT id, number, type, model, power_type, manufacturer, year_built, depot, status
		FROM locomotives WHERE id = $1
	`, id).Scan(&l.ID, &l.Number, &l.Type, &l.Model, &l.PowerType,
		&l.Manufacturer, &l.YearBuilt, &l.Depot, &l.Status)
	if err != nil {
		return nil, fmt.Errorf("locomotive_pg.GetByID: %w", err)
	}
	return l, nil
}

func (r *LocomotivePg) Create(ctx context.Context, l *domain.Locomotive) (int, error) {
	var id int
	err := r.db.QueryRow(ctx, `
		INSERT INTO locomotives (number, type, model, power_type, manufacturer, year_built, depot, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, l.Number, l.Type, l.Model, l.PowerType, l.Manufacturer, l.YearBuilt, l.Depot, l.Status).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("locomotive_pg.Create: %w", err)
	}
	return id, nil
}

func (r *LocomotivePg) Update(ctx context.Context, l *domain.Locomotive) error {
	_, err := r.db.Exec(ctx, `
		UPDATE locomotives
		SET number=$1, type=$2, model=$3, power_type=$4, manufacturer=$5,
		    year_built=$6, depot=$7, status=$8
		WHERE id=$9
	`, l.Number, l.Type, l.Model, l.PowerType, l.Manufacturer,
		l.YearBuilt, l.Depot, l.Status, l.ID)
	if err != nil {
		return fmt.Errorf("locomotive_pg.Update: %w", err)
	}
	return nil
}

func (r *LocomotivePg) Delete(ctx context.Context, id int) error {
	_, err := r.db.Exec(ctx, `DELETE FROM locomotives WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("locomotive_pg.Delete: %w", err)
	}
	return nil
}
