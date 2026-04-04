package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type HealthPg struct {
	db *pgxpool.Pool
}

func NewHealthPg(db *pgxpool.Pool) *HealthPg {
	return &HealthPg{db: db}
}

func (r *HealthPg) InsertSnapshot(ctx context.Context, s *domain.HealthSnapshot) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO health_snapshots (locomotive_id, ts, health_score, top_factors)
		VALUES ($1, $2, $3, $4)
	`, s.LocomotiveID, s.Ts, s.HealthScore, s.TopFactors)
	if err != nil {
		return fmt.Errorf("health_pg.InsertSnapshot: %w", err)
	}
	return nil
}

func (r *HealthPg) GetSnapshots(ctx context.Context, locomotiveID int, from, to time.Time) ([]*domain.HealthSnapshot, error) {
	rows, err := r.db.Query(ctx, `
		SELECT date_trunc('minute', ts) AS bucket, AVG(health_score) AS avg_health
		FROM health_snapshots
		WHERE locomotive_id=$1 AND ts BETWEEN $2 AND $3
		GROUP BY bucket
		ORDER BY bucket ASC
	`, locomotiveID, from, to)
	if err != nil {
		return nil, fmt.Errorf("health_pg.GetSnapshots: %w", err)
	}
	defer rows.Close()

	var result []*domain.HealthSnapshot
	for rows.Next() {
		s := &domain.HealthSnapshot{LocomotiveID: locomotiveID}
		if err := rows.Scan(&s.Ts, &s.HealthScore); err != nil {
			return nil, fmt.Errorf("health_pg.GetSnapshots scan: %w", err)
		}
		result = append(result, s)
	}
	return result, rows.Err()
}
