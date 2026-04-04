package domain

import "time"

type Alert struct {
	ID             int64      `json:"id"`
	LocomotiveID   int        `json:"locomotive_id"`
	Ts             time.Time  `json:"ts"`
	ParameterName  string     `json:"parameter_name"`
	Value          *float64   `json:"value,omitempty"`
	ThresholdValue *float64   `json:"threshold_value,omitempty"`
	Severity       string     `json:"severity"` // warning | critical
	Message        string     `json:"message"`
	IsAcknowledged bool       `json:"is_acknowledged"`
	AcknowledgedAt *time.Time `json:"acknowledged_at,omitempty"`
	AcknowledgedBy *string    `json:"acknowledged_by,omitempty"`
	ResolvedAt     *time.Time `json:"resolved_at,omitempty"`
}
