package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type TelemetryPg struct {
	db *pgxpool.Pool
}

func NewTelemetryPg(db *pgxpool.Pool) *TelemetryPg {
	return &TelemetryPg{db: db}
}

func (r *TelemetryPg) UpsertCurrent(ctx context.Context, t *domain.Telemetry) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO telemetry_current (
			locomotive_id, ts,
			speed, traction_force, wheel_slip,
			engine_rpm, engine_temp, oil_pressure, oil_temp, fuel_level, fuel_consumption,
			pantograph_voltage, traction_current, traction_voltage, inverter_temp, battery_voltage,
			brake_pipe_pressure, brake_cylinder_pressure, main_reservoir_pressure,
			ambient_temp, gps_lat, gps_lon, health
		) VALUES (
			$1, $2,
			$3, $4, $5,
			$6, $7, $8, $9, $10, $11,
			$12, $13, $14, $15, $16,
			$17, $18, $19,
			$20, $21, $22, $23
		)
		ON CONFLICT (locomotive_id) DO UPDATE SET
			ts                      = EXCLUDED.ts,
			speed                   = COALESCE(EXCLUDED.speed, telemetry_current.speed),
			traction_force          = COALESCE(EXCLUDED.traction_force, telemetry_current.traction_force),
			wheel_slip              = COALESCE(EXCLUDED.wheel_slip, telemetry_current.wheel_slip),
			engine_rpm              = COALESCE(EXCLUDED.engine_rpm, telemetry_current.engine_rpm),
			engine_temp             = COALESCE(EXCLUDED.engine_temp, telemetry_current.engine_temp),
			oil_pressure            = COALESCE(EXCLUDED.oil_pressure, telemetry_current.oil_pressure),
			oil_temp                = COALESCE(EXCLUDED.oil_temp, telemetry_current.oil_temp),
			fuel_level              = COALESCE(EXCLUDED.fuel_level, telemetry_current.fuel_level),
			fuel_consumption        = COALESCE(EXCLUDED.fuel_consumption, telemetry_current.fuel_consumption),
			pantograph_voltage      = COALESCE(EXCLUDED.pantograph_voltage, telemetry_current.pantograph_voltage),
			traction_current        = COALESCE(EXCLUDED.traction_current, telemetry_current.traction_current),
			traction_voltage        = COALESCE(EXCLUDED.traction_voltage, telemetry_current.traction_voltage),
			inverter_temp           = COALESCE(EXCLUDED.inverter_temp, telemetry_current.inverter_temp),
			battery_voltage         = COALESCE(EXCLUDED.battery_voltage, telemetry_current.battery_voltage),
			brake_pipe_pressure     = COALESCE(EXCLUDED.brake_pipe_pressure, telemetry_current.brake_pipe_pressure),
			brake_cylinder_pressure = COALESCE(EXCLUDED.brake_cylinder_pressure, telemetry_current.brake_cylinder_pressure),
			main_reservoir_pressure = COALESCE(EXCLUDED.main_reservoir_pressure, telemetry_current.main_reservoir_pressure),
			ambient_temp            = COALESCE(EXCLUDED.ambient_temp, telemetry_current.ambient_temp),
			gps_lat                 = COALESCE(EXCLUDED.gps_lat, telemetry_current.gps_lat),
			gps_lon                 = COALESCE(EXCLUDED.gps_lon, telemetry_current.gps_lon),
			health                  = COALESCE(EXCLUDED.health, telemetry_current.health)
	`,
		t.LocomotiveID, t.Ts,
		t.Speed, t.TractionForce, t.WheelSlip,
		t.EngineRpm, t.EngineTemp, t.OilPressure, t.OilTemp, t.FuelLevel, t.FuelConsumption,
		t.PantographVoltage, t.TractionCurrent, t.TractionVoltage, t.InverterTemp, t.BatteryVoltage,
		t.BrakePipePressure, t.BrakeCylinderPressure, t.MainReservoirPressure,
		t.AmbientTemp, t.GpsLat, t.GpsLon, t.Health,
	)
	if err != nil {
		return fmt.Errorf("telemetry_pg.UpsertCurrent: %w", err)
	}
	return nil
}

func (r *TelemetryPg) InsertHistory(ctx context.Context, t *domain.Telemetry) error {
	batch := &pgx.Batch{}
	batch.Queue(`
		INSERT INTO telemetry_history (
			locomotive_id, ts,
			speed, traction_force, wheel_slip,
			engine_rpm, engine_temp, oil_pressure, oil_temp, fuel_level, fuel_consumption,
			pantograph_voltage, traction_current, traction_voltage, inverter_temp, battery_voltage,
			brake_pipe_pressure, brake_cylinder_pressure, main_reservoir_pressure,
			ambient_temp, gps_lat, gps_lon, health
		) VALUES (
			$1, $2,
			$3, $4, $5,
			$6, $7, $8, $9, $10, $11,
			$12, $13, $14, $15, $16,
			$17, $18, $19,
			$20, $21, $22, $23
		)
	`,
		t.LocomotiveID, t.Ts,
		t.Speed, t.TractionForce, t.WheelSlip,
		t.EngineRpm, t.EngineTemp, t.OilPressure, t.OilTemp, t.FuelLevel, t.FuelConsumption,
		t.PantographVoltage, t.TractionCurrent, t.TractionVoltage, t.InverterTemp, t.BatteryVoltage,
		t.BrakePipePressure, t.BrakeCylinderPressure, t.MainReservoirPressure,
		t.AmbientTemp, t.GpsLat, t.GpsLon, t.Health,
	)

	br := r.db.SendBatch(ctx, batch)
	defer br.Close()

	if _, err := br.Exec(); err != nil {
		return fmt.Errorf("telemetry_pg.InsertHistory: %w", err)
	}
	return nil
}

func (r *TelemetryPg) GetCurrent(ctx context.Context, locomotiveID int) (*domain.Telemetry, error) {
	t := &domain.Telemetry{}
	err := r.db.QueryRow(ctx, `
		SELECT locomotive_id, ts,
			speed, traction_force, wheel_slip,
			engine_rpm, engine_temp, oil_pressure, oil_temp, fuel_level, fuel_consumption,
			pantograph_voltage, traction_current, traction_voltage, inverter_temp, battery_voltage,
			brake_pipe_pressure, brake_cylinder_pressure, main_reservoir_pressure,
			ambient_temp, gps_lat, gps_lon, health
		FROM telemetry_current WHERE locomotive_id=$1
	`, locomotiveID).Scan(
		&t.LocomotiveID, &t.Ts,
		&t.Speed, &t.TractionForce, &t.WheelSlip,
		&t.EngineRpm, &t.EngineTemp, &t.OilPressure, &t.OilTemp, &t.FuelLevel, &t.FuelConsumption,
		&t.PantographVoltage, &t.TractionCurrent, &t.TractionVoltage, &t.InverterTemp, &t.BatteryVoltage,
		&t.BrakePipePressure, &t.BrakeCylinderPressure, &t.MainReservoirPressure,
		&t.AmbientTemp, &t.GpsLat, &t.GpsLon, &t.Health,
	)
	if err != nil {
		return nil, fmt.Errorf("telemetry_pg.GetCurrent: %w", err)
	}
	return t, nil
}

func (r *TelemetryPg) GetHistory(ctx context.Context, locomotiveID int, from, to time.Time, limit int) ([]*domain.Telemetry, error) {
	if limit <= 0 {
		limit = 1000
	}
	rows, err := r.db.Query(ctx, `
		SELECT locomotive_id, ts,
			speed, traction_force, wheel_slip,
			engine_rpm, engine_temp, oil_pressure, oil_temp, fuel_level, fuel_consumption,
			pantograph_voltage, traction_current, traction_voltage, inverter_temp, battery_voltage,
			brake_pipe_pressure, brake_cylinder_pressure, main_reservoir_pressure,
			ambient_temp, gps_lat, gps_lon, health
		FROM telemetry_history
		WHERE locomotive_id=$1 AND ts BETWEEN $2 AND $3
		ORDER BY ts ASC
		LIMIT $4
	`, locomotiveID, from, to, limit)
	if err != nil {
		return nil, fmt.Errorf("telemetry_pg.GetHistory: %w", err)
	}
	defer rows.Close()

	var result []*domain.Telemetry
	for rows.Next() {
		t := &domain.Telemetry{}
		if err := rows.Scan(
			&t.LocomotiveID, &t.Ts,
			&t.Speed, &t.TractionForce, &t.WheelSlip,
			&t.EngineRpm, &t.EngineTemp, &t.OilPressure, &t.OilTemp, &t.FuelLevel, &t.FuelConsumption,
			&t.PantographVoltage, &t.TractionCurrent, &t.TractionVoltage, &t.InverterTemp, &t.BatteryVoltage,
			&t.BrakePipePressure, &t.BrakeCylinderPressure, &t.MainReservoirPressure,
			&t.AmbientTemp, &t.GpsLat, &t.GpsLon, &t.Health,
		); err != nil {
			return nil, fmt.Errorf("telemetry_pg.GetHistory scan: %w", err)
		}
		result = append(result, t)
	}
	return result, rows.Err()
}

func (r *TelemetryPg) GetLimits(ctx context.Context, locomotiveID int) (*domain.TelemetryLimits, error) {
	l := &domain.TelemetryLimits{}
	err := r.db.QueryRow(ctx, `
		SELECT id, locomotive_id,
			speed_min, speed_max, speed_warning_min, speed_warning_max, speed_critical_min, speed_critical_max,
			traction_force_min, traction_force_max, traction_force_warning_min, traction_force_warning_max, traction_force_critical_min, traction_force_critical_max,
			wheel_slip_min, wheel_slip_max, wheel_slip_warning_min, wheel_slip_warning_max, wheel_slip_critical_min, wheel_slip_critical_max,
			engine_rpm_min, engine_rpm_max, engine_rpm_warning_min, engine_rpm_warning_max, engine_rpm_critical_min, engine_rpm_critical_max,
			engine_temp_min, engine_temp_max, engine_temp_warning_min, engine_temp_warning_max, engine_temp_critical_min, engine_temp_critical_max,
			oil_pressure_min, oil_pressure_max, oil_pressure_warning_min, oil_pressure_warning_max, oil_pressure_critical_min, oil_pressure_critical_max,
			oil_temp_min, oil_temp_max, oil_temp_warning_min, oil_temp_warning_max, oil_temp_critical_min, oil_temp_critical_max,
			fuel_level_min, fuel_level_max, fuel_level_warning_min, fuel_level_warning_max, fuel_level_critical_min, fuel_level_critical_max,
			fuel_consumption_min, fuel_consumption_max, fuel_consumption_warning_min, fuel_consumption_warning_max, fuel_consumption_critical_min, fuel_consumption_critical_max,
			pantograph_voltage_min, pantograph_voltage_max, pantograph_voltage_warning_min, pantograph_voltage_warning_max, pantograph_voltage_critical_min, pantograph_voltage_critical_max,
			traction_current_min, traction_current_max, traction_current_warning_min, traction_current_warning_max, traction_current_critical_min, traction_current_critical_max,
			traction_voltage_min, traction_voltage_max, traction_voltage_warning_min, traction_voltage_warning_max, traction_voltage_critical_min, traction_voltage_critical_max,
			inverter_temp_min, inverter_temp_max, inverter_temp_warning_min, inverter_temp_warning_max, inverter_temp_critical_min, inverter_temp_critical_max,
			battery_voltage_min, battery_voltage_max, battery_voltage_warning_min, battery_voltage_warning_max, battery_voltage_critical_min, battery_voltage_critical_max,
			brake_pipe_pressure_min, brake_pipe_pressure_max, brake_pipe_pressure_warning_min, brake_pipe_pressure_warning_max, brake_pipe_pressure_critical_min, brake_pipe_pressure_critical_max,
			brake_cylinder_pressure_min, brake_cylinder_pressure_max, brake_cylinder_pressure_warning_min, brake_cylinder_pressure_warning_max, brake_cylinder_pressure_critical_min, brake_cylinder_pressure_critical_max,
			main_reservoir_pressure_min, main_reservoir_pressure_max, main_reservoir_pressure_warning_min, main_reservoir_pressure_warning_max, main_reservoir_pressure_critical_min, main_reservoir_pressure_critical_max,
			ambient_temp_min, ambient_temp_max, ambient_temp_warning_min, ambient_temp_warning_max, ambient_temp_critical_min, ambient_temp_critical_max
		FROM telemetry_limits WHERE locomotive_id=$1
	`, locomotiveID).Scan(
		&l.ID, &l.LocomotiveID,
		&l.SpeedMin, &l.SpeedMax, &l.SpeedWarningMin, &l.SpeedWarningMax, &l.SpeedCriticalMin, &l.SpeedCriticalMax,
		&l.TractionForceMin, &l.TractionForceMax, &l.TractionForceWarningMin, &l.TractionForceWarningMax, &l.TractionForceCriticalMin, &l.TractionForceCriticalMax,
		&l.WheelSlipMin, &l.WheelSlipMax, &l.WheelSlipWarningMin, &l.WheelSlipWarningMax, &l.WheelSlipCriticalMin, &l.WheelSlipCriticalMax,
		&l.EngineRpmMin, &l.EngineRpmMax, &l.EngineRpmWarningMin, &l.EngineRpmWarningMax, &l.EngineRpmCriticalMin, &l.EngineRpmCriticalMax,
		&l.EngineTempMin, &l.EngineTempMax, &l.EngineTempWarningMin, &l.EngineTempWarningMax, &l.EngineTempCriticalMin, &l.EngineTempCriticalMax,
		&l.OilPressureMin, &l.OilPressureMax, &l.OilPressureWarningMin, &l.OilPressureWarningMax, &l.OilPressureCriticalMin, &l.OilPressureCriticalMax,
		&l.OilTempMin, &l.OilTempMax, &l.OilTempWarningMin, &l.OilTempWarningMax, &l.OilTempCriticalMin, &l.OilTempCriticalMax,
		&l.FuelLevelMin, &l.FuelLevelMax, &l.FuelLevelWarningMin, &l.FuelLevelWarningMax, &l.FuelLevelCriticalMin, &l.FuelLevelCriticalMax,
		&l.FuelConsumptionMin, &l.FuelConsumptionMax, &l.FuelConsumptionWarningMin, &l.FuelConsumptionWarningMax, &l.FuelConsumptionCriticalMin, &l.FuelConsumptionCriticalMax,
		&l.PantographVoltageMin, &l.PantographVoltageMax, &l.PantographVoltageWarningMin, &l.PantographVoltageWarningMax, &l.PantographVoltageCriticalMin, &l.PantographVoltageCriticalMax,
		&l.TractionCurrentMin, &l.TractionCurrentMax, &l.TractionCurrentWarningMin, &l.TractionCurrentWarningMax, &l.TractionCurrentCriticalMin, &l.TractionCurrentCriticalMax,
		&l.TractionVoltageMin, &l.TractionVoltageMax, &l.TractionVoltageWarningMin, &l.TractionVoltageWarningMax, &l.TractionVoltageCriticalMin, &l.TractionVoltageCriticalMax,
		&l.InverterTempMin, &l.InverterTempMax, &l.InverterTempWarningMin, &l.InverterTempWarningMax, &l.InverterTempCriticalMin, &l.InverterTempCriticalMax,
		&l.BatteryVoltageMin, &l.BatteryVoltageMax, &l.BatteryVoltageWarningMin, &l.BatteryVoltageWarningMax, &l.BatteryVoltageCriticalMin, &l.BatteryVoltageCriticalMax,
		&l.BrakePipePressureMin, &l.BrakePipePressureMax, &l.BrakePipePressureWarningMin, &l.BrakePipePressureWarningMax, &l.BrakePipePressureCriticalMin, &l.BrakePipePressureCriticalMax,
		&l.BrakeCylinderPressureMin, &l.BrakeCylinderPressureMax, &l.BrakeCylinderPressureWarningMin, &l.BrakeCylinderPressureWarningMax, &l.BrakeCylinderPressureCriticalMin, &l.BrakeCylinderPressureCriticalMax,
		&l.MainReservoirPressureMin, &l.MainReservoirPressureMax, &l.MainReservoirPressureWarningMin, &l.MainReservoirPressureWarningMax, &l.MainReservoirPressureCriticalMin, &l.MainReservoirPressureCriticalMax,
		&l.AmbientTempMin, &l.AmbientTempMax, &l.AmbientTempWarningMin, &l.AmbientTempWarningMax, &l.AmbientTempCriticalMin, &l.AmbientTempCriticalMax,
	)
	if err != nil {
		return nil, fmt.Errorf("telemetry_pg.GetLimits: %w", err)
	}
	return l, nil
}

func (r *TelemetryPg) UpsertLimits(ctx context.Context, l *domain.TelemetryLimits) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO telemetry_limits (
			locomotive_id,
			speed_min, speed_max, speed_warning_min, speed_warning_max, speed_critical_min, speed_critical_max,
			traction_force_min, traction_force_max, traction_force_warning_min, traction_force_warning_max, traction_force_critical_min, traction_force_critical_max,
			wheel_slip_min, wheel_slip_max, wheel_slip_warning_min, wheel_slip_warning_max, wheel_slip_critical_min, wheel_slip_critical_max,
			engine_rpm_min, engine_rpm_max, engine_rpm_warning_min, engine_rpm_warning_max, engine_rpm_critical_min, engine_rpm_critical_max,
			engine_temp_min, engine_temp_max, engine_temp_warning_min, engine_temp_warning_max, engine_temp_critical_min, engine_temp_critical_max,
			oil_pressure_min, oil_pressure_max, oil_pressure_warning_min, oil_pressure_warning_max, oil_pressure_critical_min, oil_pressure_critical_max,
			oil_temp_min, oil_temp_max, oil_temp_warning_min, oil_temp_warning_max, oil_temp_critical_min, oil_temp_critical_max,
			fuel_level_min, fuel_level_max, fuel_level_warning_min, fuel_level_warning_max, fuel_level_critical_min, fuel_level_critical_max,
			fuel_consumption_min, fuel_consumption_max, fuel_consumption_warning_min, fuel_consumption_warning_max, fuel_consumption_critical_min, fuel_consumption_critical_max,
			pantograph_voltage_min, pantograph_voltage_max, pantograph_voltage_warning_min, pantograph_voltage_warning_max, pantograph_voltage_critical_min, pantograph_voltage_critical_max,
			traction_current_min, traction_current_max, traction_current_warning_min, traction_current_warning_max, traction_current_critical_min, traction_current_critical_max,
			traction_voltage_min, traction_voltage_max, traction_voltage_warning_min, traction_voltage_warning_max, traction_voltage_critical_min, traction_voltage_critical_max,
			inverter_temp_min, inverter_temp_max, inverter_temp_warning_min, inverter_temp_warning_max, inverter_temp_critical_min, inverter_temp_critical_max,
			battery_voltage_min, battery_voltage_max, battery_voltage_warning_min, battery_voltage_warning_max, battery_voltage_critical_min, battery_voltage_critical_max,
			brake_pipe_pressure_min, brake_pipe_pressure_max, brake_pipe_pressure_warning_min, brake_pipe_pressure_warning_max, brake_pipe_pressure_critical_min, brake_pipe_pressure_critical_max,
			brake_cylinder_pressure_min, brake_cylinder_pressure_max, brake_cylinder_pressure_warning_min, brake_cylinder_pressure_warning_max, brake_cylinder_pressure_critical_min, brake_cylinder_pressure_critical_max,
			main_reservoir_pressure_min, main_reservoir_pressure_max, main_reservoir_pressure_warning_min, main_reservoir_pressure_warning_max, main_reservoir_pressure_critical_min, main_reservoir_pressure_critical_max,
			ambient_temp_min, ambient_temp_max, ambient_temp_warning_min, ambient_temp_warning_max, ambient_temp_critical_min, ambient_temp_critical_max
		) VALUES (
			$1,
			$2,$3,$4,$5,$6,$7,
			$8,$9,$10,$11,$12,$13,
			$14,$15,$16,$17,$18,$19,
			$20,$21,$22,$23,$24,$25,
			$26,$27,$28,$29,$30,$31,
			$32,$33,$34,$35,$36,$37,
			$38,$39,$40,$41,$42,$43,
			$44,$45,$46,$47,$48,$49,
			$50,$51,$52,$53,$54,$55,
			$56,$57,$58,$59,$60,$61,
			$62,$63,$64,$65,$66,$67,
			$68,$69,$70,$71,$72,$73,
			$74,$75,$76,$77,$78,$79,
			$80,$81,$82,$83,$84,$85,
			$86,$87,$88,$89,$90,$91,
			$92,$93,$94,$95,$96,$97,
			$98,$99,$100,$101,$102,$103,
			$104,$105,$106,$107,$108,$109
		)
		ON CONFLICT (locomotive_id) DO UPDATE SET
			speed_min=$2, speed_max=$3, speed_warning_min=$4, speed_warning_max=$5, speed_critical_min=$6, speed_critical_max=$7,
			traction_force_min=$8, traction_force_max=$9, traction_force_warning_min=$10, traction_force_warning_max=$11, traction_force_critical_min=$12, traction_force_critical_max=$13,
			wheel_slip_min=$14, wheel_slip_max=$15, wheel_slip_warning_min=$16, wheel_slip_warning_max=$17, wheel_slip_critical_min=$18, wheel_slip_critical_max=$19,
			engine_rpm_min=$20, engine_rpm_max=$21, engine_rpm_warning_min=$22, engine_rpm_warning_max=$23, engine_rpm_critical_min=$24, engine_rpm_critical_max=$25,
			engine_temp_min=$26, engine_temp_max=$27, engine_temp_warning_min=$28, engine_temp_warning_max=$29, engine_temp_critical_min=$30, engine_temp_critical_max=$31,
			oil_pressure_min=$32, oil_pressure_max=$33, oil_pressure_warning_min=$34, oil_pressure_warning_max=$35, oil_pressure_critical_min=$36, oil_pressure_critical_max=$37,
			oil_temp_min=$38, oil_temp_max=$39, oil_temp_warning_min=$40, oil_temp_warning_max=$41, oil_temp_critical_min=$42, oil_temp_critical_max=$43,
			fuel_level_min=$44, fuel_level_max=$45, fuel_level_warning_min=$46, fuel_level_warning_max=$47, fuel_level_critical_min=$48, fuel_level_critical_max=$49,
			fuel_consumption_min=$50, fuel_consumption_max=$51, fuel_consumption_warning_min=$52, fuel_consumption_warning_max=$53, fuel_consumption_critical_min=$54, fuel_consumption_critical_max=$55,
			pantograph_voltage_min=$56, pantograph_voltage_max=$57, pantograph_voltage_warning_min=$58, pantograph_voltage_warning_max=$59, pantograph_voltage_critical_min=$60, pantograph_voltage_critical_max=$61,
			traction_current_min=$62, traction_current_max=$63, traction_current_warning_min=$64, traction_current_warning_max=$65, traction_current_critical_min=$66, traction_current_critical_max=$67,
			traction_voltage_min=$68, traction_voltage_max=$69, traction_voltage_warning_min=$70, traction_voltage_warning_max=$71, traction_voltage_critical_min=$72, traction_voltage_critical_max=$73,
			inverter_temp_min=$74, inverter_temp_max=$75, inverter_temp_warning_min=$76, inverter_temp_warning_max=$77, inverter_temp_critical_min=$78, inverter_temp_critical_max=$79,
			battery_voltage_min=$80, battery_voltage_max=$81, battery_voltage_warning_min=$82, battery_voltage_warning_max=$83, battery_voltage_critical_min=$84, battery_voltage_critical_max=$85,
			brake_pipe_pressure_min=$86, brake_pipe_pressure_max=$87, brake_pipe_pressure_warning_min=$88, brake_pipe_pressure_warning_max=$89, brake_pipe_pressure_critical_min=$90, brake_pipe_pressure_critical_max=$91,
			brake_cylinder_pressure_min=$92, brake_cylinder_pressure_max=$93, brake_cylinder_pressure_warning_min=$94, brake_cylinder_pressure_warning_max=$95, brake_cylinder_pressure_critical_min=$96, brake_cylinder_pressure_critical_max=$97,
			main_reservoir_pressure_min=$98, main_reservoir_pressure_max=$99, main_reservoir_pressure_warning_min=$100, main_reservoir_pressure_warning_max=$101, main_reservoir_pressure_critical_min=$102, main_reservoir_pressure_critical_max=$103,
			ambient_temp_min=$104, ambient_temp_max=$105, ambient_temp_warning_min=$106, ambient_temp_warning_max=$107, ambient_temp_critical_min=$108, ambient_temp_critical_max=$109
	`,
		l.LocomotiveID,
		l.SpeedMin, l.SpeedMax, l.SpeedWarningMin, l.SpeedWarningMax, l.SpeedCriticalMin, l.SpeedCriticalMax,
		l.TractionForceMin, l.TractionForceMax, l.TractionForceWarningMin, l.TractionForceWarningMax, l.TractionForceCriticalMin, l.TractionForceCriticalMax,
		l.WheelSlipMin, l.WheelSlipMax, l.WheelSlipWarningMin, l.WheelSlipWarningMax, l.WheelSlipCriticalMin, l.WheelSlipCriticalMax,
		l.EngineRpmMin, l.EngineRpmMax, l.EngineRpmWarningMin, l.EngineRpmWarningMax, l.EngineRpmCriticalMin, l.EngineRpmCriticalMax,
		l.EngineTempMin, l.EngineTempMax, l.EngineTempWarningMin, l.EngineTempWarningMax, l.EngineTempCriticalMin, l.EngineTempCriticalMax,
		l.OilPressureMin, l.OilPressureMax, l.OilPressureWarningMin, l.OilPressureWarningMax, l.OilPressureCriticalMin, l.OilPressureCriticalMax,
		l.OilTempMin, l.OilTempMax, l.OilTempWarningMin, l.OilTempWarningMax, l.OilTempCriticalMin, l.OilTempCriticalMax,
		l.FuelLevelMin, l.FuelLevelMax, l.FuelLevelWarningMin, l.FuelLevelWarningMax, l.FuelLevelCriticalMin, l.FuelLevelCriticalMax,
		l.FuelConsumptionMin, l.FuelConsumptionMax, l.FuelConsumptionWarningMin, l.FuelConsumptionWarningMax, l.FuelConsumptionCriticalMin, l.FuelConsumptionCriticalMax,
		l.PantographVoltageMin, l.PantographVoltageMax, l.PantographVoltageWarningMin, l.PantographVoltageWarningMax, l.PantographVoltageCriticalMin, l.PantographVoltageCriticalMax,
		l.TractionCurrentMin, l.TractionCurrentMax, l.TractionCurrentWarningMin, l.TractionCurrentWarningMax, l.TractionCurrentCriticalMin, l.TractionCurrentCriticalMax,
		l.TractionVoltageMin, l.TractionVoltageMax, l.TractionVoltageWarningMin, l.TractionVoltageWarningMax, l.TractionVoltageCriticalMin, l.TractionVoltageCriticalMax,
		l.InverterTempMin, l.InverterTempMax, l.InverterTempWarningMin, l.InverterTempWarningMax, l.InverterTempCriticalMin, l.InverterTempCriticalMax,
		l.BatteryVoltageMin, l.BatteryVoltageMax, l.BatteryVoltageWarningMin, l.BatteryVoltageWarningMax, l.BatteryVoltageCriticalMin, l.BatteryVoltageCriticalMax,
		l.BrakePipePressureMin, l.BrakePipePressureMax, l.BrakePipePressureWarningMin, l.BrakePipePressureWarningMax, l.BrakePipePressureCriticalMin, l.BrakePipePressureCriticalMax,
		l.BrakeCylinderPressureMin, l.BrakeCylinderPressureMax, l.BrakeCylinderPressureWarningMin, l.BrakeCylinderPressureWarningMax, l.BrakeCylinderPressureCriticalMin, l.BrakeCylinderPressureCriticalMax,
		l.MainReservoirPressureMin, l.MainReservoirPressureMax, l.MainReservoirPressureWarningMin, l.MainReservoirPressureWarningMax, l.MainReservoirPressureCriticalMin, l.MainReservoirPressureCriticalMax,
		l.AmbientTempMin, l.AmbientTempMax, l.AmbientTempWarningMin, l.AmbientTempWarningMax, l.AmbientTempCriticalMin, l.AmbientTempCriticalMax,
	)
	if err != nil {
		return fmt.Errorf("telemetry_pg.UpsertLimits: %w", err)
	}
	return nil
}
