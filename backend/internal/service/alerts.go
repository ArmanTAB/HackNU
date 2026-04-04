package service

import (
	"context"
	"fmt"
	"time"

	"github.com/thedakeen/locomotive-twin/internal/domain"
	"github.com/thedakeen/locomotive-twin/internal/repository"
)

type AlertService struct {
	repo repository.AlertRepository
}

func NewAlertService(repo repository.AlertRepository) *AlertService {
	return &AlertService{repo: repo}
}

func (s *AlertService) GetAlerts(ctx context.Context, locomotiveID int, activeOnly bool, severity string) ([]*domain.Alert, error) {
	alerts, err := s.repo.GetByLocomotive(ctx, locomotiveID, activeOnly, severity)
	if err != nil {
		return nil, fmt.Errorf("alert.GetAlerts: %w", err)
	}
	return alerts, nil
}

func (s *AlertService) Acknowledge(ctx context.Context, alertID int64, acknowledgedBy string) error {
	if err := s.repo.Acknowledge(ctx, alertID, acknowledgedBy); err != nil {
		return fmt.Errorf("alert.Acknowledge: %w", err)
	}
	return nil
}

func (s *AlertService) GetActiveCount(ctx context.Context, locomotiveID int, severity string) (int, error) {
	return s.repo.GetActiveCount(ctx, locomotiveID, severity)
}

// CheckAndCreate inspects telemetry against limits and inserts alerts for any breaches.
func (s *AlertService) CheckAndCreate(ctx context.Context, t *domain.Telemetry, limits *domain.TelemetryLimits) ([]*domain.Alert, error) {
	type check struct {
		param   string
		value   *float64
		warnMin *float64
		warnMax *float64
		critMin *float64
		critMax *float64
	}

	checks := []check{
		{"engine_temp", t.EngineTemp, limits.EngineTempWarningMin, limits.EngineTempWarningMax, limits.EngineTempCriticalMin, limits.EngineTempCriticalMax},
		{"oil_pressure", t.OilPressure, limits.OilPressureWarningMin, limits.OilPressureWarningMax, limits.OilPressureCriticalMin, limits.OilPressureCriticalMax},
		{"oil_temp", t.OilTemp, limits.OilTempWarningMin, limits.OilTempWarningMax, limits.OilTempCriticalMin, limits.OilTempCriticalMax},
		{"engine_rpm", t.EngineRpm, limits.EngineRpmWarningMin, limits.EngineRpmWarningMax, limits.EngineRpmCriticalMin, limits.EngineRpmCriticalMax},
		{"fuel_level", t.FuelLevel, limits.FuelLevelWarningMin, limits.FuelLevelWarningMax, limits.FuelLevelCriticalMin, limits.FuelLevelCriticalMax},
		{"brake_pipe_pressure", t.BrakePipePressure, limits.BrakePipePressureWarningMin, limits.BrakePipePressureWarningMax, limits.BrakePipePressureCriticalMin, limits.BrakePipePressureCriticalMax},
		{"brake_cylinder_pressure", t.BrakeCylinderPressure, limits.BrakeCylinderPressureWarningMin, limits.BrakeCylinderPressureWarningMax, limits.BrakeCylinderPressureCriticalMin, limits.BrakeCylinderPressureCriticalMax},
		{"main_reservoir_pressure", t.MainReservoirPressure, limits.MainReservoirPressureWarningMin, limits.MainReservoirPressureWarningMax, limits.MainReservoirPressureCriticalMin, limits.MainReservoirPressureCriticalMax},
		{"speed", t.Speed, limits.SpeedWarningMin, limits.SpeedWarningMax, limits.SpeedCriticalMin, limits.SpeedCriticalMax},
		{"pantograph_voltage", t.PantographVoltage, limits.PantographVoltageWarningMin, limits.PantographVoltageWarningMax, limits.PantographVoltageCriticalMin, limits.PantographVoltageCriticalMax},
		{"battery_voltage", t.BatteryVoltage, limits.BatteryVoltageWarningMin, limits.BatteryVoltageWarningMax, limits.BatteryVoltageCriticalMin, limits.BatteryVoltageCriticalMax},
		{"inverter_temp", t.InverterTemp, limits.InverterTempWarningMin, limits.InverterTempWarningMax, limits.InverterTempCriticalMin, limits.InverterTempCriticalMax},
	}

	var created []*domain.Alert
	for _, c := range checks {
		if c.value == nil {
			continue
		}
		v := *c.value

		severity, threshold, breached := detectBreach(v, c.warnMin, c.warnMax, c.critMin, c.critMax)
		if !breached {
			continue
		}

		// Deduplicate: skip if there's already an active alert for this param+severity
		has, err := s.repo.HasActiveAlert(ctx, t.LocomotiveID, c.param, severity)
		if err != nil {
			return created, fmt.Errorf("alert.CheckAndCreate HasActiveAlert: %w", err)
		}
		if has {
			continue
		}

		msg := fmt.Sprintf("%s is %.2f (threshold: %.2f)", c.param, v, threshold)
		alert := &domain.Alert{
			LocomotiveID:   t.LocomotiveID,
			Ts:             time.Now().UTC(),
			ParameterName:  c.param,
			Value:          c.value,
			ThresholdValue: &threshold,
			Severity:       severity,
			Message:        msg,
		}

		id, err := s.repo.Insert(ctx, alert)
		if err != nil {
			return created, fmt.Errorf("alert.CheckAndCreate Insert: %w", err)
		}
		alert.ID = id
		created = append(created, alert)
	}
	return created, nil
}

func detectBreach(v float64, warnMin, warnMax, critMin, critMax *float64) (severity string, threshold float64, breached bool) {
	// Check critical first (higher priority)
	if critMax != nil && v > *critMax {
		return "critical", *critMax, true
	}
	if critMin != nil && v < *critMin {
		return "critical", *critMin, true
	}
	if warnMax != nil && v > *warnMax {
		return "warning", *warnMax, true
	}
	if warnMin != nil && v < *warnMin {
		return "warning", *warnMin, true
	}
	return "", 0, false
}
