package simulator

import (
	"context"
	_ "embed"
	"encoding/json"
	"log/slog"
	"math/rand"
	"time"

	"github.com/thedakeen/locomotive-twin/internal/domain"
	"github.com/thedakeen/locomotive-twin/internal/infrastructure/kafka"
)

//go:embed assets/export.geojson
var routeGeoJSON []byte

type geoJSONFile struct {
	Features []struct {
		Geometry struct {
			Type        string         `json:"type"`
			Coordinates [][][2]float64 `json:"coordinates"`
		} `json:"geometry"`
	} `json:"features"`
}

func loadRoutePoints() [][2]float64 {
	var gj geoJSONFile
	if err := json.Unmarshal(routeGeoJSON, &gj); err != nil {
		slog.Warn("simulator: failed to parse route geojson", "err", err)
		return nil
	}
	for _, f := range gj.Features {
		if f.Geometry.Type == "MultiLineString" {
			var pts [][2]float64
			for _, line := range f.Geometry.Coordinates {
				pts = append(pts, line...)
			}
			slog.Info("simulator: loaded route", "points", len(pts))
			return pts
		}
	}
	slog.Warn("simulator: no MultiLineString found in geojson")
	return nil
}

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

	// Route playback
	routePoints [][2]float64
	routeIndex  int

	profile locoProfile
}

// locoProfile defines per-locomotive behavioral envelope.
type locoProfile struct {
	baselineSpeed             float64
	baselineEngineTemp        float64
	baselineOilPressure       float64
	baselineFuelLevel         float64
	baselineBrakePipePressure float64
	baselineEngineRpm         float64
	baselinePantographVoltage float64
	baselineInverterTemp      float64
	// driftStrength: how hard values pull back to baseline each tick (0.0–1.0)
	driftStrength float64

	anomalyDisabled    bool
	anomalyMinInterval int
	anomalyMaxInterval int
	anomalyMinDuration int
	anomalyMaxDuration int
	// anomalySeverity: "warning" or "critical"
	anomalySeverity string
}

var locoProfiles = map[int]locoProfile{
	// Loco 1: healthy electric — all params in normal range, rare short warning blips
	1: {
		baselineSpeed: 65, baselineEngineTemp: 82, baselineOilPressure: 4.5,
		baselineFuelLevel: 70, baselineBrakePipePressure: 5.0, baselineEngineRpm: 1400,
		baselinePantographVoltage: 25000, baselineInverterTemp: 57,
		driftStrength:      0.05,
		anomalyMinInterval: 120, anomalyMaxInterval: 180,
		anomalyMinDuration: 5, anomalyMaxDuration: 10,
		anomalySeverity: "warning",
	},
	// Loco 2: diesel under stress — oil/fuel/brake in warning zone, frequent critical-capable anomalies
	2: {
		baselineSpeed: 75, baselineEngineTemp: 89, baselineOilPressure: 3.0,
		baselineFuelLevel: 18, baselineBrakePipePressure: 4.0, baselineEngineRpm: 1580,
		baselinePantographVoltage: 25000, baselineInverterTemp: 64,
		driftStrength:      0.12,
		anomalyMinInterval: 30, anomalyMaxInterval: 50,
		anomalyMinDuration: 15, anomalyMaxDuration: 25,
		anomalySeverity: "critical",
	},
	// Loco 3: electric — 4 params in critical zone:
	//   speed >115, brake_pipe <3.5, pantograph <20000, inverter_temp >85
	//   health from params ~62.5 − 4×8 alerts = ~30 (critical)
	3: {
		baselineSpeed: 118, baselineEngineTemp: 82, baselineOilPressure: 4.5,
		baselineFuelLevel: 65, baselineBrakePipePressure: 2.8, baselineEngineRpm: 1400,
		baselinePantographVoltage: 17000, baselineInverterTemp: 95,
		driftStrength:   0.30,
		anomalyDisabled: true,
	},
}

func profileFor(id int) locoProfile {
	if p, ok := locoProfiles[id]; ok {
		return p
	}
	return locoProfiles[1]
}

type Simulator struct {
	states   map[int]*locoState
	producer *kafka.Producer
	hz       int
}

func New(locomotiveIDs []int, producer *kafka.Producer, hz int) *Simulator {
	routePts := loadRoutePoints()
	states := make(map[int]*locoState, len(locomotiveIDs))
	for i, id := range locomotiveIDs {
		startIndex := 0
		if len(routePts) > 0 && len(locomotiveIDs) > 1 {
			startIndex = i * len(routePts) / len(locomotiveIDs)
		}
		states[id] = initialState(id, routePts, startIndex)
	}
	return &Simulator{
		states:   states,
		producer: producer,
		hz:       hz,
	}
}

func initialState(id int, routePts [][2]float64, routeIdx int) *locoState {
	p := profileFor(id)
	initialAnomalyOffset := 0
	if p.anomalyMinInterval > 0 {
		initialAnomalyOffset = rand.Intn(p.anomalyMinInterval)
	}
	gpsLat := 51.1801 + rand.Float64()*0.01
	gpsLon := 71.4460 + rand.Float64()*0.01
	if len(routePts) > 0 {
		pt := routePts[routeIdx]
		gpsLon = pt[0]
		gpsLat = pt[1]
	}
	return &locoState{
		locomotiveID:          id,
		speed:                 p.baselineSpeed + randIntDelta3(),
		tractionForce:         200.0 + rand.Float64()*50,
		wheelSlip:             0.5 + rand.Float64()*1.0,
		engineRpm:             p.baselineEngineRpm + randIntDelta3(),
		engineTemp:            p.baselineEngineTemp + randIntDelta3(),
		oilPressure:           p.baselineOilPressure + randIntDelta3(),
		oilTemp:               75 + rand.Float64()*10,
		fuelLevel:             p.baselineFuelLevel + randIntDelta3(),
		fuelConsumption:       15 + rand.Float64()*5,
		pantographVoltage:     p.baselinePantographVoltage + randn(200),
		tractionCurrent:       1000 + rand.Float64()*200,
		tractionVoltage:       800 + rand.Float64()*50,
		inverterTemp:          p.baselineInverterTemp + randn(2),
		batteryVoltage:        24.5 + rand.Float64()*1,
		brakePipePressure:     p.baselineBrakePipePressure + randn(0.1),
		brakeCylinderPressure: 0.1 + rand.Float64()*0.1,
		mainReservoirPressure: 8.5 + rand.Float64()*0.5,
		ambientTemp:           15 + rand.Float64()*10,
		gpsLat:                gpsLat,
		gpsLon:                gpsLon,
		ticksSinceAnomaly:     initialAnomalyOffset,
		routePoints:           routePts,
		routeIndex:            (routeIdx + 1) % max(len(routePts), 1),
		profile:               p,
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
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
			locos := make([]*locoState, 0, len(s.states))
			for _, state := range s.states {
				locos = append(locos, state)
			}
			// Spread locomotive messages evenly across the tick interval
			// so WS clients receive one message per loco per second, not a burst
			spread := interval / time.Duration(len(locos)+1)
			for i, state := range locos {
				if i > 0 {
					select {
					case <-ctx.Done():
						return
					case <-time.After(spread):
					}
				}
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
	p := st.profile
	st.ticksSinceAnomaly++

	// Trigger anomaly — respects per-profile intervals and disabled flag
	if !p.anomalyDisabled && st.anomalyTicks == 0 {
		rangeWidth := p.anomalyMaxInterval - p.anomalyMinInterval
		if rangeWidth < 1 {
			rangeWidth = 1
		}
		interval := p.anomalyMinInterval + rand.Intn(rangeWidth)
		if st.ticksSinceAnomaly >= interval {
			durationRange := p.anomalyMaxDuration - p.anomalyMinDuration
			if durationRange < 1 {
				durationRange = 1
			}
			st.anomalyParam = randomAnomalyParam()
			st.anomalyTicks = p.anomalyMinDuration + rand.Intn(durationRange)
			st.ticksSinceAnomaly = 0
			slog.Info("simulator anomaly", "loco", st.locomotiveID,
				"param", st.anomalyParam, "ticks", st.anomalyTicks, "severity", p.anomalySeverity)
		}
	}

	// Apply anomaly spike
	if st.anomalyTicks > 0 {
		applyAnomaly(st, p.anomalySeverity)
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
	if len(st.routePoints) > 0 {
		pt := st.routePoints[st.routeIndex]
		st.gpsLon = pt[0]
		st.gpsLat = pt[1]
		st.routeIndex = (st.routeIndex + 1) % len(st.routePoints)
	} else {
		st.gpsLat += randn(0.0001)
		st.gpsLon += randn(0.0001)
	}

	// Drift toward profile baseline — pulls values back after EMA+noise
	if p.driftStrength > 0 {
		ds := p.driftStrength
		st.speed = ema(st.speed, p.baselineSpeed, ds)
		st.engineTemp = ema(st.engineTemp, p.baselineEngineTemp, ds)
		st.oilPressure = ema(st.oilPressure, p.baselineOilPressure, ds)
		st.fuelLevel = ema(st.fuelLevel, p.baselineFuelLevel, ds)
		st.brakePipePressure = ema(st.brakePipePressure, p.baselineBrakePipePressure, ds)
		st.engineRpm = ema(st.engineRpm, p.baselineEngineRpm, ds)
		st.pantographVoltage = ema(st.pantographVoltage, p.baselinePantographVoltage, ds)
		st.inverterTemp = ema(st.inverterTemp, p.baselineInverterTemp, ds)
	}
}

func applyAnomaly(st *locoState, severity string) {
	switch st.anomalyParam {
	case "engine_temp":
		if severity == "warning" {
			st.engineTemp = 91 + rand.Float64()*8 // warning: 90–100
		} else {
			st.engineTemp = 102 + rand.Float64()*8 // critical: >100
		}
	case "oil_pressure":
		if severity == "warning" {
			st.oilPressure = 2.6 + rand.Float64()*0.8 // warning: 2.5–3.5
		} else {
			st.oilPressure = 1.0 + rand.Float64()*1.0 // critical: <2.5
		}
	case "fuel_level":
		if severity == "warning" {
			st.fuelLevel = 15 + rand.Float64()*4 // warning: 15–20
		} else {
			st.fuelLevel = 8 + rand.Float64()*5 // critical: <15
		}
	case "brake_pipe_pressure":
		if severity == "warning" {
			st.brakePipePressure = 3.6 + rand.Float64()*0.8 // warning: 3.5–4.5
		} else {
			st.brakePipePressure = 2.0 + rand.Float64()*0.5 // critical: <3.5
		}
	case "speed":
		if severity == "warning" {
			st.speed = 101 + rand.Float64()*13 // warning: 100–115
		} else {
			st.speed = 116 + rand.Float64()*10 // critical: >115
		}
	case "engine_rpm":
		if severity == "warning" {
			st.engineRpm = 1610 + rand.Float64()*180 // warning: 1600–1800
		} else {
			st.engineRpm = 1820 + rand.Float64()*100 // critical: >1800
		}
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

func randIntDelta3() float64 {
	return float64(rand.Intn(7) - 3) // [-3, +3]
}
