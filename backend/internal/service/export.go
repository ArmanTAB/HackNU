package service

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"time"

	"github.com/thedakeen/locomotive-twin/internal/repository"
)

type ExportService struct {
	telemetryRepo repository.TelemetryRepository
}

func NewExportService(telemetryRepo repository.TelemetryRepository) *ExportService {
	return &ExportService{telemetryRepo: telemetryRepo}
}

func (s *ExportService) ExportCSV(ctx context.Context, locomotiveID int, from, to time.Time, w io.Writer) error {
	records, err := s.telemetryRepo.GetHistory(ctx, locomotiveID, from, to, 100000)
	if err != nil {
		return fmt.Errorf("export.ExportCSV: %w", err)
	}

	cw := csv.NewWriter(w)
	header := []string{
		"ts", "speed", "traction_force", "wheel_slip",
		"engine_rpm", "engine_temp", "oil_pressure", "oil_temp", "fuel_level", "fuel_consumption",
		"pantograph_voltage", "traction_current", "traction_voltage", "inverter_temp", "battery_voltage",
		"brake_pipe_pressure", "brake_cylinder_pressure", "main_reservoir_pressure",
		"ambient_temp", "gps_lat", "gps_lon", "health",
	}
	if err := cw.Write(header); err != nil {
		return fmt.Errorf("export.ExportCSV write header: %w", err)
	}

	for _, t := range records {
		row := []string{
			t.Ts.UTC().Format(time.RFC3339),
			f64(t.Speed), f64(t.TractionForce), f64(t.WheelSlip),
			f64(t.EngineRpm), f64(t.EngineTemp), f64(t.OilPressure), f64(t.OilTemp), f64(t.FuelLevel), f64(t.FuelConsumption),
			f64(t.PantographVoltage), f64(t.TractionCurrent), f64(t.TractionVoltage), f64(t.InverterTemp), f64(t.BatteryVoltage),
			f64(t.BrakePipePressure), f64(t.BrakeCylinderPressure), f64(t.MainReservoirPressure),
			f64(t.AmbientTemp), f64(t.GpsLat), f64(t.GpsLon), f64(t.Health),
		}
		if err := cw.Write(row); err != nil {
			return fmt.Errorf("export.ExportCSV write row: %w", err)
		}
	}

	cw.Flush()
	return cw.Error()
}

func f64(v *float64) string {
	if v == nil {
		return ""
	}
	return strconv.FormatFloat(*v, 'f', 4, 64)
}
