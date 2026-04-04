package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type AlertPg struct {
	db *pgxpool.Pool
}

func NewAlertPg(db *pgxpool.Pool) *AlertPg {
	return &AlertPg{db: db}
}

func (r *AlertPg) Insert(ctx context.Context, a *domain.Alert) (int64, error) {
	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO alerts (locomotive_id, ts, parameter_name, value, threshold_value, severity, message)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, a.LocomotiveID, a.Ts, a.ParameterName, a.Value, a.ThresholdValue, a.Severity, a.Message).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("alert_pg.Insert: %w", err)
	}
	return id, nil
}

func (r *AlertPg) GetByLocomotive(ctx context.Context, locomotiveID int, activeOnly bool, severity string) ([]*domain.Alert, error) {
	query := strings.Builder{}
	args := []any{locomotiveID}
	query.WriteString(`
		SELECT id, locomotive_id, ts, parameter_name, value, threshold_value,
		       severity, message, is_acknowledged, acknowledged_at, acknowledged_by, resolved_at
		FROM alerts WHERE locomotive_id=$1
	`)

	if activeOnly {
		query.WriteString(` AND is_acknowledged=FALSE AND resolved_at IS NULL`)
	}
	if severity != "" {
		args = append(args, severity)
		query.WriteString(fmt.Sprintf(` AND severity=$%d`, len(args)))
	}
	query.WriteString(` ORDER BY ts DESC`)

	rows, err := r.db.Query(ctx, query.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("alert_pg.GetByLocomotive: %w", err)
	}
	defer rows.Close()

	var alerts []*domain.Alert
	for rows.Next() {
		a := &domain.Alert{}
		if err := rows.Scan(&a.ID, &a.LocomotiveID, &a.Ts, &a.ParameterName, &a.Value,
			&a.ThresholdValue, &a.Severity, &a.Message, &a.IsAcknowledged,
			&a.AcknowledgedAt, &a.AcknowledgedBy, &a.ResolvedAt); err != nil {
			return nil, fmt.Errorf("alert_pg.GetByLocomotive scan: %w", err)
		}
		alerts = append(alerts, a)
	}
	return alerts, rows.Err()
}

func (r *AlertPg) Acknowledge(ctx context.Context, alertID int64, acknowledgedBy string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE alerts SET is_acknowledged=TRUE, acknowledged_at=NOW(), acknowledged_by=$2
		WHERE id=$1
	`, alertID, acknowledgedBy)
	if err != nil {
		return fmt.Errorf("alert_pg.Acknowledge: %w", err)
	}
	return nil
}

func (r *AlertPg) HasActiveAlert(ctx context.Context, locomotiveID int, parameterName, severity string) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(1) FROM alerts
		WHERE locomotive_id=$1 AND parameter_name=$2 AND severity=$3
		  AND is_acknowledged=FALSE AND resolved_at IS NULL
	`, locomotiveID, parameterName, severity).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("alert_pg.HasActiveAlert: %w", err)
	}
	return count > 0, nil
}

func (r *AlertPg) GetActiveCount(ctx context.Context, locomotiveID int, severity string) (int, error) {
	var count int
	var err error
	if severity == "" {
		err = r.db.QueryRow(ctx, `
			SELECT COUNT(1) FROM alerts
			WHERE locomotive_id=$1 AND is_acknowledged=FALSE AND resolved_at IS NULL
		`, locomotiveID).Scan(&count)
	} else {
		err = r.db.QueryRow(ctx, `
			SELECT COUNT(1) FROM alerts
			WHERE locomotive_id=$1 AND severity=$2 AND is_acknowledged=FALSE AND resolved_at IS NULL
		`, locomotiveID, severity).Scan(&count)
	}
	if err != nil {
		return 0, fmt.Errorf("alert_pg.GetActiveCount: %w", err)
	}
	return count, nil
}
