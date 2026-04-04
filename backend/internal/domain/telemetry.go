package domain

import "time"

// Telemetry represents a telemetry reading from a locomotive.
// All sensor fields are pointers to handle sparse Kafka messages (only send what changed).
type Telemetry struct {
	LocomotiveID int       `json:"locomotive_id"`
	Ts           time.Time `json:"ts"`

	Speed         *float64 `json:"speed,omitempty"`
	TractionForce *float64 `json:"traction_force,omitempty"`
	WheelSlip     *float64 `json:"wheel_slip,omitempty"`

	EngineRpm       *float64 `json:"engine_rpm,omitempty"`
	EngineTemp      *float64 `json:"engine_temp,omitempty"`
	OilPressure     *float64 `json:"oil_pressure,omitempty"`
	OilTemp         *float64 `json:"oil_temp,omitempty"`
	FuelLevel       *float64 `json:"fuel_level,omitempty"`
	FuelConsumption *float64 `json:"fuel_consumption,omitempty"`

	PantographVoltage *float64 `json:"pantograph_voltage,omitempty"`
	TractionCurrent   *float64 `json:"traction_current,omitempty"`
	TractionVoltage   *float64 `json:"traction_voltage,omitempty"`
	InverterTemp      *float64 `json:"inverter_temp,omitempty"`
	BatteryVoltage    *float64 `json:"battery_voltage,omitempty"`

	BrakePipePressure     *float64 `json:"brake_pipe_pressure,omitempty"`
	BrakeCylinderPressure *float64 `json:"brake_cylinder_pressure,omitempty"`
	MainReservoirPressure *float64 `json:"main_reservoir_pressure,omitempty"`

	AmbientTemp *float64 `json:"ambient_temp,omitempty"`
	GpsLat      *float64 `json:"gps_lat,omitempty"`
	GpsLon      *float64 `json:"gps_lon,omitempty"`

	Health *float64 `json:"health,omitempty"`
}

// TelemetryLimits holds normal operating ranges and alert thresholds for a locomotive.
type TelemetryLimits struct {
	ID           int `json:"id"`
	LocomotiveID int `json:"locomotive_id"`

	SpeedMin         *float64 `json:"speed_min,omitempty"`
	SpeedMax         *float64 `json:"speed_max,omitempty"`
	SpeedWarningMin  *float64 `json:"speed_warning_min,omitempty"`
	SpeedWarningMax  *float64 `json:"speed_warning_max,omitempty"`
	SpeedCriticalMin *float64 `json:"speed_critical_min,omitempty"`
	SpeedCriticalMax *float64 `json:"speed_critical_max,omitempty"`

	TractionForceMin         *float64 `json:"traction_force_min,omitempty"`
	TractionForceMax         *float64 `json:"traction_force_max,omitempty"`
	TractionForceWarningMin  *float64 `json:"traction_force_warning_min,omitempty"`
	TractionForceWarningMax  *float64 `json:"traction_force_warning_max,omitempty"`
	TractionForceCriticalMin *float64 `json:"traction_force_critical_min,omitempty"`
	TractionForceCriticalMax *float64 `json:"traction_force_critical_max,omitempty"`

	WheelSlipMin         *float64 `json:"wheel_slip_min,omitempty"`
	WheelSlipMax         *float64 `json:"wheel_slip_max,omitempty"`
	WheelSlipWarningMin  *float64 `json:"wheel_slip_warning_min,omitempty"`
	WheelSlipWarningMax  *float64 `json:"wheel_slip_warning_max,omitempty"`
	WheelSlipCriticalMin *float64 `json:"wheel_slip_critical_min,omitempty"`
	WheelSlipCriticalMax *float64 `json:"wheel_slip_critical_max,omitempty"`

	EngineRpmMin         *float64 `json:"engine_rpm_min,omitempty"`
	EngineRpmMax         *float64 `json:"engine_rpm_max,omitempty"`
	EngineRpmWarningMin  *float64 `json:"engine_rpm_warning_min,omitempty"`
	EngineRpmWarningMax  *float64 `json:"engine_rpm_warning_max,omitempty"`
	EngineRpmCriticalMin *float64 `json:"engine_rpm_critical_min,omitempty"`
	EngineRpmCriticalMax *float64 `json:"engine_rpm_critical_max,omitempty"`

	EngineTempMin         *float64 `json:"engine_temp_min,omitempty"`
	EngineTempMax         *float64 `json:"engine_temp_max,omitempty"`
	EngineTempWarningMin  *float64 `json:"engine_temp_warning_min,omitempty"`
	EngineTempWarningMax  *float64 `json:"engine_temp_warning_max,omitempty"`
	EngineTempCriticalMin *float64 `json:"engine_temp_critical_min,omitempty"`
	EngineTempCriticalMax *float64 `json:"engine_temp_critical_max,omitempty"`

	OilPressureMin         *float64 `json:"oil_pressure_min,omitempty"`
	OilPressureMax         *float64 `json:"oil_pressure_max,omitempty"`
	OilPressureWarningMin  *float64 `json:"oil_pressure_warning_min,omitempty"`
	OilPressureWarningMax  *float64 `json:"oil_pressure_warning_max,omitempty"`
	OilPressureCriticalMin *float64 `json:"oil_pressure_critical_min,omitempty"`
	OilPressureCriticalMax *float64 `json:"oil_pressure_critical_max,omitempty"`

	OilTempMin         *float64 `json:"oil_temp_min,omitempty"`
	OilTempMax         *float64 `json:"oil_temp_max,omitempty"`
	OilTempWarningMin  *float64 `json:"oil_temp_warning_min,omitempty"`
	OilTempWarningMax  *float64 `json:"oil_temp_warning_max,omitempty"`
	OilTempCriticalMin *float64 `json:"oil_temp_critical_min,omitempty"`
	OilTempCriticalMax *float64 `json:"oil_temp_critical_max,omitempty"`

	FuelLevelMin         *float64 `json:"fuel_level_min,omitempty"`
	FuelLevelMax         *float64 `json:"fuel_level_max,omitempty"`
	FuelLevelWarningMin  *float64 `json:"fuel_level_warning_min,omitempty"`
	FuelLevelWarningMax  *float64 `json:"fuel_level_warning_max,omitempty"`
	FuelLevelCriticalMin *float64 `json:"fuel_level_critical_min,omitempty"`
	FuelLevelCriticalMax *float64 `json:"fuel_level_critical_max,omitempty"`

	FuelConsumptionMin         *float64 `json:"fuel_consumption_min,omitempty"`
	FuelConsumptionMax         *float64 `json:"fuel_consumption_max,omitempty"`
	FuelConsumptionWarningMin  *float64 `json:"fuel_consumption_warning_min,omitempty"`
	FuelConsumptionWarningMax  *float64 `json:"fuel_consumption_warning_max,omitempty"`
	FuelConsumptionCriticalMin *float64 `json:"fuel_consumption_critical_min,omitempty"`
	FuelConsumptionCriticalMax *float64 `json:"fuel_consumption_critical_max,omitempty"`

	PantographVoltageMin         *float64 `json:"pantograph_voltage_min,omitempty"`
	PantographVoltageMax         *float64 `json:"pantograph_voltage_max,omitempty"`
	PantographVoltageWarningMin  *float64 `json:"pantograph_voltage_warning_min,omitempty"`
	PantographVoltageWarningMax  *float64 `json:"pantograph_voltage_warning_max,omitempty"`
	PantographVoltageCriticalMin *float64 `json:"pantograph_voltage_critical_min,omitempty"`
	PantographVoltageCriticalMax *float64 `json:"pantograph_voltage_critical_max,omitempty"`

	TractionCurrentMin         *float64 `json:"traction_current_min,omitempty"`
	TractionCurrentMax         *float64 `json:"traction_current_max,omitempty"`
	TractionCurrentWarningMin  *float64 `json:"traction_current_warning_min,omitempty"`
	TractionCurrentWarningMax  *float64 `json:"traction_current_warning_max,omitempty"`
	TractionCurrentCriticalMin *float64 `json:"traction_current_critical_min,omitempty"`
	TractionCurrentCriticalMax *float64 `json:"traction_current_critical_max,omitempty"`

	TractionVoltageMin         *float64 `json:"traction_voltage_min,omitempty"`
	TractionVoltageMax         *float64 `json:"traction_voltage_max,omitempty"`
	TractionVoltageWarningMin  *float64 `json:"traction_voltage_warning_min,omitempty"`
	TractionVoltageWarningMax  *float64 `json:"traction_voltage_warning_max,omitempty"`
	TractionVoltageCriticalMin *float64 `json:"traction_voltage_critical_min,omitempty"`
	TractionVoltageCriticalMax *float64 `json:"traction_voltage_critical_max,omitempty"`

	InverterTempMin         *float64 `json:"inverter_temp_min,omitempty"`
	InverterTempMax         *float64 `json:"inverter_temp_max,omitempty"`
	InverterTempWarningMin  *float64 `json:"inverter_temp_warning_min,omitempty"`
	InverterTempWarningMax  *float64 `json:"inverter_temp_warning_max,omitempty"`
	InverterTempCriticalMin *float64 `json:"inverter_temp_critical_min,omitempty"`
	InverterTempCriticalMax *float64 `json:"inverter_temp_critical_max,omitempty"`

	BatteryVoltageMin         *float64 `json:"battery_voltage_min,omitempty"`
	BatteryVoltageMax         *float64 `json:"battery_voltage_max,omitempty"`
	BatteryVoltageWarningMin  *float64 `json:"battery_voltage_warning_min,omitempty"`
	BatteryVoltageWarningMax  *float64 `json:"battery_voltage_warning_max,omitempty"`
	BatteryVoltageCriticalMin *float64 `json:"battery_voltage_critical_min,omitempty"`
	BatteryVoltageCriticalMax *float64 `json:"battery_voltage_critical_max,omitempty"`

	BrakePipePressureMin         *float64 `json:"brake_pipe_pressure_min,omitempty"`
	BrakePipePressureMax         *float64 `json:"brake_pipe_pressure_max,omitempty"`
	BrakePipePressureWarningMin  *float64 `json:"brake_pipe_pressure_warning_min,omitempty"`
	BrakePipePressureWarningMax  *float64 `json:"brake_pipe_pressure_warning_max,omitempty"`
	BrakePipePressureCriticalMin *float64 `json:"brake_pipe_pressure_critical_min,omitempty"`
	BrakePipePressureCriticalMax *float64 `json:"brake_pipe_pressure_critical_max,omitempty"`

	BrakeCylinderPressureMin         *float64 `json:"brake_cylinder_pressure_min,omitempty"`
	BrakeCylinderPressureMax         *float64 `json:"brake_cylinder_pressure_max,omitempty"`
	BrakeCylinderPressureWarningMin  *float64 `json:"brake_cylinder_pressure_warning_min,omitempty"`
	BrakeCylinderPressureWarningMax  *float64 `json:"brake_cylinder_pressure_warning_max,omitempty"`
	BrakeCylinderPressureCriticalMin *float64 `json:"brake_cylinder_pressure_critical_min,omitempty"`
	BrakeCylinderPressureCriticalMax *float64 `json:"brake_cylinder_pressure_critical_max,omitempty"`

	MainReservoirPressureMin         *float64 `json:"main_reservoir_pressure_min,omitempty"`
	MainReservoirPressureMax         *float64 `json:"main_reservoir_pressure_max,omitempty"`
	MainReservoirPressureWarningMin  *float64 `json:"main_reservoir_pressure_warning_min,omitempty"`
	MainReservoirPressureWarningMax  *float64 `json:"main_reservoir_pressure_warning_max,omitempty"`
	MainReservoirPressureCriticalMin *float64 `json:"main_reservoir_pressure_critical_min,omitempty"`
	MainReservoirPressureCriticalMax *float64 `json:"main_reservoir_pressure_critical_max,omitempty"`

	AmbientTempMin         *float64 `json:"ambient_temp_min,omitempty"`
	AmbientTempMax         *float64 `json:"ambient_temp_max,omitempty"`
	AmbientTempWarningMin  *float64 `json:"ambient_temp_warning_min,omitempty"`
	AmbientTempWarningMax  *float64 `json:"ambient_temp_warning_max,omitempty"`
	AmbientTempCriticalMin *float64 `json:"ambient_temp_critical_min,omitempty"`
	AmbientTempCriticalMax *float64 `json:"ambient_temp_critical_max,omitempty"`
}
