package health

import (
	"encoding/json"
	"sort"

	"github.com/thedakeen/locomotive-twin/internal/domain"
)

type paramDef struct {
	name                 string
	value                *float64
	normalMin, normalMax *float64
	warnMin, warnMax     *float64
	critMin, critMax     *float64
	weight               float64
}

// Calculate computes the health index for a locomotive based on telemetry and limits.
func Calculate(
	t *domain.Telemetry,
	limits *domain.TelemetryLimits,
	powerType string,
	activeWarnings, activeCriticals int,
) domain.HealthStatus {
	params := buildParams(t, limits, powerType)

	type scored struct {
		name   string
		score  float64
		weight float64
	}

	var total float64
	var factors []scored

	for _, p := range params {
		s := paramScore(p.value, p.normalMin, p.normalMax, p.warnMin, p.warnMax, p.critMin, p.critMax)
		total += p.weight * s
		factors = append(factors, scored{p.name, s, p.weight})
	}

	health := total * 100.0

	// Alert penalty
	health -= float64(activeWarnings) * 2.0
	health -= float64(activeCriticals) * 8.0
	if health < 0 {
		health = 0
	}
	if health > 100 {
		health = 100
	}

	// Top 5 factors (highest degradation)
	sort.Slice(factors, func(i, j int) bool {
		di := (1 - factors[i].score) * factors[i].weight
		dj := (1 - factors[j].score) * factors[j].weight
		return di > dj
	})

	var topFactors []domain.TopFactor
	for i := 0; i < 5 && i < len(factors); i++ {
		topFactors = append(topFactors, domain.TopFactor{
			Param:  factors[i].name,
			Score:  factors[i].score,
			Weight: factors[i].weight,
		})
	}

	topJSON, _ := json.Marshal(topFactors)

	cat := category(health)
	return domain.HealthStatus{
		Score:      health,
		Category:   cat,
		TopFactors: topJSON,
	}
}

func category(score float64) string {
	switch {
	case score >= 80:
		return "normal"
	case score >= 50:
		return "warning"
	default:
		return "critical"
	}
}

// paramScore returns 1.0 (normal), 0.6 (warning zone), 0.1 (critical zone), 0.5 (nil).
func paramScore(value, normalMin, normalMax, warnMin, warnMax, critMin, critMax *float64) float64 {
	if value == nil {
		return 0.5
	}
	v := *value

	// Check if in normal range
	inNormal := true
	if normalMin != nil && v < *normalMin {
		inNormal = false
	}
	if normalMax != nil && v > *normalMax {
		inNormal = false
	}
	if inNormal {
		return 1.0
	}

	// Check if in critical zone
	inCritical := false
	if critMin != nil && v < *critMin {
		inCritical = true
	}
	if critMax != nil && v > *critMax {
		inCritical = true
	}
	if inCritical {
		return 0.1
	}

	// Warning zone
	return 0.6
}

func buildParams(t *domain.Telemetry, l *domain.TelemetryLimits, powerType string) []paramDef {
	// Base weights
	brakeWeight := 0.30 / 3.0
	engineWeight := 0.25 / 4.0
	movementWeight := 0.20 / 3.0
	fuelWeight := 0.10 / 2.0
	batteryWeight := 0.05
	electricWeight := 0.10 / 4.0

	switch powerType {
	case "diesel":
		// Skip electric group, redistribute 0.10 to Engine (0.25+0.10=0.35)
		engineWeight = 0.35 / 4.0
		electricWeight = 0
		batteryWeight = 0.05 // battery still relevant for diesel starter
	case "electric":
		// Skip engine/fuel groups (0.25+0.10+0.05=0.40), redistribute to Electrics (0.10+0.40=0.50)
		engineWeight = 0
		fuelWeight = 0
		batteryWeight = 0
		electricWeight = 0.50 / 4.0
	}

	params := []paramDef{
		// Brakes
		{name: "brake_pipe_pressure", value: t.BrakePipePressure,
			normalMin: l.BrakePipePressureMin, normalMax: l.BrakePipePressureMax,
			warnMin: l.BrakePipePressureWarningMin, warnMax: l.BrakePipePressureWarningMax,
			critMin: l.BrakePipePressureCriticalMin, critMax: l.BrakePipePressureCriticalMax,
			weight: brakeWeight},
		{name: "brake_cylinder_pressure", value: t.BrakeCylinderPressure,
			normalMin: l.BrakeCylinderPressureMin, normalMax: l.BrakeCylinderPressureMax,
			warnMin: l.BrakeCylinderPressureWarningMin, warnMax: l.BrakeCylinderPressureWarningMax,
			critMin: l.BrakeCylinderPressureCriticalMin, critMax: l.BrakeCylinderPressureCriticalMax,
			weight: brakeWeight},
		{name: "main_reservoir_pressure", value: t.MainReservoirPressure,
			normalMin: l.MainReservoirPressureMin, normalMax: l.MainReservoirPressureMax,
			warnMin: l.MainReservoirPressureWarningMin, warnMax: l.MainReservoirPressureWarningMax,
			critMin: l.MainReservoirPressureCriticalMin, critMax: l.MainReservoirPressureCriticalMax,
			weight: brakeWeight},
		// Engine/Drivetrain
		{name: "engine_temp", value: t.EngineTemp,
			normalMin: l.EngineTempMin, normalMax: l.EngineTempMax,
			warnMin: l.EngineTempWarningMin, warnMax: l.EngineTempWarningMax,
			critMin: l.EngineTempCriticalMin, critMax: l.EngineTempCriticalMax,
			weight: engineWeight},
		{name: "oil_pressure", value: t.OilPressure,
			normalMin: l.OilPressureMin, normalMax: l.OilPressureMax,
			warnMin: l.OilPressureWarningMin, warnMax: l.OilPressureWarningMax,
			critMin: l.OilPressureCriticalMin, critMax: l.OilPressureCriticalMax,
			weight: engineWeight},
		{name: "oil_temp", value: t.OilTemp,
			normalMin: l.OilTempMin, normalMax: l.OilTempMax,
			warnMin: l.OilTempWarningMin, warnMax: l.OilTempWarningMax,
			critMin: l.OilTempCriticalMin, critMax: l.OilTempCriticalMax,
			weight: engineWeight},
		{name: "engine_rpm", value: t.EngineRpm,
			normalMin: l.EngineRpmMin, normalMax: l.EngineRpmMax,
			warnMin: l.EngineRpmWarningMin, warnMax: l.EngineRpmWarningMax,
			critMin: l.EngineRpmCriticalMin, critMax: l.EngineRpmCriticalMax,
			weight: engineWeight},
		// Movement
		{name: "speed", value: t.Speed,
			normalMin: l.SpeedMin, normalMax: l.SpeedMax,
			warnMin: l.SpeedWarningMin, warnMax: l.SpeedWarningMax,
			critMin: l.SpeedCriticalMin, critMax: l.SpeedCriticalMax,
			weight: movementWeight},
		{name: "traction_force", value: t.TractionForce,
			normalMin: l.TractionForceMin, normalMax: l.TractionForceMax,
			warnMin: l.TractionForceWarningMin, warnMax: l.TractionForceWarningMax,
			critMin: l.TractionForceCriticalMin, critMax: l.TractionForceCriticalMax,
			weight: movementWeight},
		{name: "wheel_slip", value: t.WheelSlip,
			normalMin: l.WheelSlipMin, normalMax: l.WheelSlipMax,
			warnMin: l.WheelSlipWarningMin, warnMax: l.WheelSlipWarningMax,
			critMin: l.WheelSlipCriticalMin, critMax: l.WheelSlipCriticalMax,
			weight: movementWeight},
		// Fuel/Energy
		{name: "fuel_level", value: t.FuelLevel,
			normalMin: l.FuelLevelMin, normalMax: l.FuelLevelMax,
			warnMin: l.FuelLevelWarningMin, warnMax: l.FuelLevelWarningMax,
			critMin: l.FuelLevelCriticalMin, critMax: l.FuelLevelCriticalMax,
			weight: fuelWeight},
		{name: "fuel_consumption", value: t.FuelConsumption,
			normalMin: l.FuelConsumptionMin, normalMax: l.FuelConsumptionMax,
			warnMin: l.FuelConsumptionWarningMin, warnMax: l.FuelConsumptionWarningMax,
			critMin: l.FuelConsumptionCriticalMin, critMax: l.FuelConsumptionCriticalMax,
			weight: fuelWeight},
		// Battery
		{name: "battery_voltage", value: t.BatteryVoltage,
			normalMin: l.BatteryVoltageMin, normalMax: l.BatteryVoltageMax,
			warnMin: l.BatteryVoltageWarningMin, warnMax: l.BatteryVoltageWarningMax,
			critMin: l.BatteryVoltageCriticalMin, critMax: l.BatteryVoltageCriticalMax,
			weight: batteryWeight},
		// Electrics
		{name: "pantograph_voltage", value: t.PantographVoltage,
			normalMin: l.PantographVoltageMin, normalMax: l.PantographVoltageMax,
			warnMin: l.PantographVoltageWarningMin, warnMax: l.PantographVoltageWarningMax,
			critMin: l.PantographVoltageCriticalMin, critMax: l.PantographVoltageCriticalMax,
			weight: electricWeight},
		{name: "traction_current", value: t.TractionCurrent,
			normalMin: l.TractionCurrentMin, normalMax: l.TractionCurrentMax,
			warnMin: l.TractionCurrentWarningMin, warnMax: l.TractionCurrentWarningMax,
			critMin: l.TractionCurrentCriticalMin, critMax: l.TractionCurrentCriticalMax,
			weight: electricWeight},
		{name: "traction_voltage", value: t.TractionVoltage,
			normalMin: l.TractionVoltageMin, normalMax: l.TractionVoltageMax,
			warnMin: l.TractionVoltageWarningMin, warnMax: l.TractionVoltageWarningMax,
			critMin: l.TractionVoltageCriticalMin, critMax: l.TractionVoltageCriticalMax,
			weight: electricWeight},
		{name: "inverter_temp", value: t.InverterTemp,
			normalMin: l.InverterTempMin, normalMax: l.InverterTempMax,
			warnMin: l.InverterTempWarningMin, warnMax: l.InverterTempWarningMax,
			critMin: l.InverterTempCriticalMin, critMax: l.InverterTempCriticalMax,
			weight: electricWeight},
	}

	// Filter out zero-weight params
	var filtered []paramDef
	for _, p := range params {
		if p.weight > 0 {
			filtered = append(filtered, p)
		}
	}
	return filtered
}
