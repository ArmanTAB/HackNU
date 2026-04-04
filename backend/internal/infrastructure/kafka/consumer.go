package kafka

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	kafkago "github.com/segmentio/kafka-go"
	"github.com/thedakeen/locomotive-twin/internal/domain"
	healthcalc "github.com/thedakeen/locomotive-twin/internal/health"
	"github.com/thedakeen/locomotive-twin/internal/infrastructure/ws"
	"github.com/thedakeen/locomotive-twin/internal/repository"
	"github.com/thedakeen/locomotive-twin/internal/service"
)

type Consumer struct {
	reader           *kafkago.Reader
	telemetryRepo    repository.TelemetryRepository
	locoRepo         repository.LocomotiveRepository
	alertSvc         *service.AlertService
	healthSvc        *service.HealthService
	hub              *ws.Hub
	snapshotInterval time.Duration
	lastSnapshot     map[int]time.Time
}

func NewConsumer(
	brokers []string,
	topic, groupID string,
	telemetryRepo repository.TelemetryRepository,
	locoRepo repository.LocomotiveRepository,
	alertSvc *service.AlertService,
	healthSvc *service.HealthService,
	hub *ws.Hub,
	snapshotInterval int,
) *Consumer {
	reader := kafkago.NewReader(kafkago.ReaderConfig{
		Brokers:     brokers,
		Topic:       topic,
		GroupID:     groupID,
		MinBytes:    1,
		MaxBytes:    10e6,
		StartOffset: kafkago.LastOffset,
	})

	return &Consumer{
		reader:           reader,
		telemetryRepo:    telemetryRepo,
		locoRepo:         locoRepo,
		alertSvc:         alertSvc,
		healthSvc:        healthSvc,
		hub:              hub,
		snapshotInterval: time.Duration(snapshotInterval) * time.Second,
		lastSnapshot:     make(map[int]time.Time),
	}
}

func (c *Consumer) Run(ctx context.Context) {
	slog.Info("kafka consumer started")
	for {
		msg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				slog.Info("kafka consumer stopping")
				return
			}
			slog.Error("kafka consumer fetch", "err", err)
			continue
		}

		if err := c.process(ctx, msg.Value); err != nil {
			slog.Error("kafka consumer process", "err", err)
		}

		if err := c.reader.CommitMessages(ctx, msg); err != nil {
			slog.Error("kafka consumer commit", "err", err)
		}
	}
}

func (c *Consumer) Close() error {
	return c.reader.Close()
}

func (c *Consumer) process(ctx context.Context, data []byte) error {
	var t domain.Telemetry
	if err := json.Unmarshal(data, &t); err != nil {
		slog.Warn("kafka consumer unmarshal", "err", err, "data", string(data))
		return nil // bad message, skip
	}

	if t.Ts.IsZero() {
		t.Ts = time.Now().UTC()
	}

	// Fetch locomotive for power_type
	loco, err := c.locoRepo.GetByID(ctx, t.LocomotiveID)
	if err != nil {
		slog.Warn("kafka consumer: unknown locomotive", "id", t.LocomotiveID)
		return nil
	}

	// Fetch limits
	limits, err := c.telemetryRepo.GetLimits(ctx, t.LocomotiveID)
	if err != nil {
		slog.Warn("kafka consumer: no limits for locomotive", "id", t.LocomotiveID, "err", err)
		limits = &domain.TelemetryLimits{}
	}

	// Get active alert counts for health penalty
	warnings, _ := c.alertSvc.GetActiveCount(ctx, t.LocomotiveID, "warning")
	criticals, _ := c.alertSvc.GetActiveCount(ctx, t.LocomotiveID, "critical")

	// Calculate health
	status := healthcalc.Calculate(&t, limits, loco.PowerType, warnings, criticals)
	t.Health = &status.Score

	// Persist
	if err := c.telemetryRepo.UpsertCurrent(ctx, &t); err != nil {
		slog.Error("kafka consumer: UpsertCurrent", "err", err)
	}
	if err := c.telemetryRepo.InsertHistory(ctx, &t); err != nil {
		slog.Error("kafka consumer: InsertHistory", "err", err)
	}

	// Check and create alerts
	newAlerts, err := c.alertSvc.CheckAndCreate(ctx, &t, limits)
	if err != nil {
		slog.Error("kafka consumer: CheckAndCreate alerts", "err", err)
	}

	// Health snapshot
	if time.Since(c.lastSnapshot[t.LocomotiveID]) >= c.snapshotInterval {
		snap := &domain.HealthSnapshot{
			LocomotiveID: t.LocomotiveID,
			Ts:           t.Ts,
			HealthScore:  status.Score,
			TopFactors:   status.TopFactors,
		}
		if err := c.healthSvc.InsertSnapshot(ctx, snap); err != nil {
			slog.Error("kafka consumer: InsertSnapshot", "err", err)
		}
		c.lastSnapshot[t.LocomotiveID] = time.Now()
	}

	// Build WS broadcast payload
	type alertSummary struct {
		ID        int64  `json:"id"`
		Parameter string `json:"parameter"`
		Severity  string `json:"severity"`
		Message   string `json:"message"`
	}

	var alertSummaries []alertSummary
	for _, a := range newAlerts {
		alertSummaries = append(alertSummaries, alertSummary{
			ID:        a.ID,
			Parameter: a.ParameterName,
			Severity:  a.Severity,
			Message:   a.Message,
		})
	}

	payload := map[string]any{
		"type":          "telemetry",
		"locomotive_id": t.LocomotiveID,
		"ts":            t.Ts,
		"data":          t,
		"health":        status.Score,
		"alerts":        alertSummaries,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		slog.Error("kafka consumer: marshal broadcast", "err", err)
		return nil
	}

	c.hub.Broadcast(ws.BroadcastMsg{
		LocomotiveID: t.LocomotiveID,
		Payload:      payloadBytes,
	})

	return nil
}
