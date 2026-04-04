package domain

import (
	"encoding/json"
	"time"
)

type HealthSnapshot struct {
	ID           int64           `json:"id"`
	LocomotiveID int             `json:"locomotive_id"`
	Ts           time.Time       `json:"ts"`
	HealthScore  float64         `json:"health_score"`
	TopFactors   json.RawMessage `json:"top_factors,omitempty" swaggertype:"array,object"`
}

type HealthStatus struct {
	Score      float64         `json:"score"`
	Category   string          `json:"category"` // normal | warning | critical
	TopFactors json.RawMessage `json:"top_factors,omitempty" swaggertype:"array,object"`
}

type TopFactor struct {
	Param  string  `json:"param"`
	Score  float64 `json:"score"`
	Weight float64 `json:"weight"`
}
