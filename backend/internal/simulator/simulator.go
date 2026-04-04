package simulator

import (
	"context"
	"encoding/json"
	"log/slog"
	"math/rand"
	"time"

	"github.com/thedakeen/locomotive-twin/internal/domain"
	"github.com/thedakeen/locomotive-twin/internal/infrastructure/kafka"
)

type locoState struct {
	locomotiveID int
	// All sensor values
	speed                 float64
	tractionForce         float64
	wheelSlip             float64
	engineRpm             float64
	engineTemp            float64
	oilPressure           float64
	oilTemp               float64
	fuelLevel             float64
	fuelConsumption       float64
	pantographVoltage     float64
	tractionCurrent       float64
	tractionVoltage       float64
	inverterTemp          float64
	batteryVoltage        float64
	brakePipePressure     float64
	brakeCylinderPressure float64
	mainReservoirPressure float64
	ambientTemp           float64
	gpsLat                float64
	gpsLon                float64

	// Anomaly tracking
	anomalyParam      string
	anomalyTicks      int
	ticksSinceAnomaly int
}

type Simulator struct {
	states   map[int]*locoState
	producer *kafka.Producer
	hz       int
}

func New(locomotiveIDs []int, producer *kafka.Producer, hz int) *Simulator {
	states := make(map[int]*locoState, len(locomotiveIDs))
	for _, id := range locomotiveIDs {
		states[id] = initialState(id)
	}
	return &Simulator{
		states:   states,
		producer: producer,
		hz:       hz,
	}
}

func initialState(id int) *locoState {
	return &locoState{
		locomotiveID:          id,
		speed:                 60.0 + rand.Float64()*20,
		tractionForce:         200.0 + rand.Float64()*50,
		wheelSlip:             0.5 + rand.Float64()*1.0,
		engineRpm:             1400 + rand.Float64()*200,
		engineTemp:            82 + rand.Float64()*8,
		oilPressure:           4.2 + rand.Float64()*0.5,
		oilTemp:               75 + rand.Float64()*10,
		fuelLevel:             65 + rand.Float64()*15,
		fuelConsumption:       15 + rand.Float64()*5,
		pantographVoltage:     25000 + rand.Float64()*500,
		tractionCurrent:       1000 + rand.Float64()*200,
		tractionVoltage:       800 + rand.Float64()*50,
		inverterTemp:          55 + rand.Float64()*10,
		batteryVoltage:        24.5 + rand.Float64()*1,
		brakePipePressure:     5.0 + rand.Float64()*0.2,
		brakeCylinderPressure: 0.1 + rand.Float64()*0.1,
		mainReservoirPressure: 8.5 + rand.Float64()*0.5,
		ambientTemp:           15 + rand.Float64()*10,
		gpsLat:                51.1801 + rand.Float64()*0.01,
		gpsLon:                71.4460 + rand.Float64()*0.01,
		ticksSinceAnomaly:     rand.Intn(60),
	}
}

func (s *Simulator) Run(ctx context.Context) {
	if s.hz <= 0 {
		s.hz = 1
	}
	interval := time.Second / time.Duration(s.hz)
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	slog.Info("simulator started", "locomotives", len(s.states), "hz", s.hz)

	for {
		select {
		case <-ctx.Done():
			slog.Info("simulator stopped")
			return
		case <-ticker.C:
			for _, state := range s.states {
				s.tick(state)
				t := stateToTelemetry(state)
				data, err := json.Marshal(t)
				if err != nil {
					slog.Error("simulator marshal", "err", err)
					continue
				}
				if err := s.producer.Publish(ctx, data); err != nil {
					if ctx.Err() != nil {
						return
					}
					slog.Error("simulator publish", "err", err)
				}
			}
		}
	}
}

func (s *Simulator) tick(st *locoState) {
	st.ticksSinceAnomaly++

	// Trigger anomaly every ~60 ticks
	if st.anomalyTicks == 0 && st.ticksSinceAnomaly >= 60+rand.Intn(30) {
		st.anomalyParam = randomAnomalyParam()
		st.anomalyTicks = 10 + rand.Intn(20)
		st.ticksSinceAnomaly = 0
		slog.Info("simulator anomaly", "loco", st.locomotiveID, "param", st.anomalyParam, "ticks", st.anomalyTicks)
	}

	// Apply anomaly spike
	if st.anomalyTicks > 0 {
		applyAnomaly(st)
		st.anomalyTicks--
	} else {
		st.anomalyParam = ""
	}

	// EMA + small random deltas
	const alpha = 0.3
	st.speed = ema(st.speed, clamp(st.speed+randn(2), 0, 130), alpha)
	st.tractionForce = ema(st.tractionForce, clamp(st.tractionForce+randn(10), 0, 500), alpha)
	st.wheelSlip = ema(st.wheelSlip, clamp(st.wheelSlip+randn(0.1), 0, 5), alpha)
	st.engineRpm = ema(st.engineRpm, clamp(st.engineRpm+randn(20), 600, 2000), alpha)
	st.engineTemp = ema(st.engineTemp, clamp(st.engineTemp+randn(0.5), 50, 110), alpha)
	st.oilPressure = ema(st.oilPressure, clamp(st.oilPressure+randn(0.1), 0, 8), alpha)
	st.oilTemp = ema(st.oilTemp, clamp(st.oilTemp+randn(0.3), 40, 120), alpha)
	st.fuelLevel = ema(st.fuelLevel, clamp(st.fuelLevel-0.01+randn(0.05), 0, 100), alpha)
	st.fuelConsumption = ema(st.fuelConsumption, clamp(st.fuelConsumption+randn(0.5), 5, 50), alpha)
	st.pantographVoltage = ema(st.pantographVoltage, clamp(st.pantographVoltage+randn(100), 20000, 30000), alpha)
	st.tractionCurrent = ema(st.tractionCurrent, clamp(st.tractionCurrent+randn(30), 0, 2000), alpha)
	st.tractionVoltage = ema(st.tractionVoltage, clamp(st.tractionVoltage+randn(10), 600, 1000), alpha)
	st.inverterTemp = ema(st.inverterTemp, clamp(st.inverterTemp+randn(0.3), 20, 100), alpha)
	st.batteryVoltage = ema(st.batteryVoltage, clamp(st.batteryVoltage+randn(0.1), 18, 32), alpha)
	st.brakePipePressure = ema(st.brakePipePressure, clamp(st.brakePipePressure+randn(0.05), 0, 7), alpha)
	st.brakeCylinderPressure = ema(st.brakeCylinderPressure, clamp(st.brakeCylinderPressure+randn(0.02), 0, 4), alpha)
	st.mainReservoirPressure = ema(st.mainReservoirPressure, clamp(st.mainReservoirPressure+randn(0.05), 5, 10), alpha)
	st.ambientTemp = ema(st.ambientTemp, clamp(st.ambientTemp+randn(0.1), -40, 50), alpha)
	st.gpsLat += randn(0.0001)
	st.gpsLon += randn(0.0001)
}

func applyAnomaly(st *locoState) {
	switch st.anomalyParam {
	case "engine_temp":
		st.engineTemp = 105 + rand.Float64()*10
	case "oil_pressure":
		st.oilPressure = 1.5 + rand.Float64()*0.5
	case "fuel_level":
		st.fuelLevel = 8 + rand.Float64()*5
	case "brake_pipe_pressure":
		st.brakePipePressure = 2.0 + rand.Float64()*0.5
	case "speed":
		st.speed = 118 + rand.Float64()*10
	case "engine_rpm":
		st.engineRpm = 1850 + rand.Float64()*100
	}
}

func randomAnomalyParam() string {
	params := []string{"engine_temp", "oil_pressure", "fuel_level", "brake_pipe_pressure", "speed", "engine_rpm"}
	return params[rand.Intn(len(params))]
}

func stateToTelemetry(st *locoState) domain.Telemetry {
	return domain.Telemetry{
		LocomotiveID:          st.locomotiveID,
		Ts:                    time.Now().UTC(),
		Speed:                 ptr(st.speed),
		TractionForce:         ptr(st.tractionForce),
		WheelSlip:             ptr(st.wheelSlip),
		EngineRpm:             ptr(st.engineRpm),
		EngineTemp:            ptr(st.engineTemp),
		OilPressure:           ptr(st.oilPressure),
		OilTemp:               ptr(st.oilTemp),
		FuelLevel:             ptr(st.fuelLevel),
		FuelConsumption:       ptr(st.fuelConsumption),
		PantographVoltage:     ptr(st.pantographVoltage),
		TractionCurrent:       ptr(st.tractionCurrent),
		TractionVoltage:       ptr(st.tractionVoltage),
		InverterTemp:          ptr(st.inverterTemp),
		BatteryVoltage:        ptr(st.batteryVoltage),
		BrakePipePressure:     ptr(st.brakePipePressure),
		BrakeCylinderPressure: ptr(st.brakeCylinderPressure),
		MainReservoirPressure: ptr(st.mainReservoirPressure),
		AmbientTemp:           ptr(st.ambientTemp),
		GpsLat:                ptr(st.gpsLat),
		GpsLon:                ptr(st.gpsLon),
	}
}

func ptr(v float64) *float64 { return &v }

func ema(old, new_, alpha float64) float64 {
	return alpha*new_ + (1-alpha)*old
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func randn(scale float64) float64 {
	return (rand.Float64()*2 - 1) * scale
}
