package kafka

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/thedakeen/locomotive-twin/internal/domain"
	"github.com/thedakeen/locomotive-twin/internal/repository"
	"github.com/thedakeen/locomotive-twin/internal/service"

	kafkago "github.com/segmentio/kafka-go"
	healthcalc "github.com/thedakeen/locomotive-twin/internal/health"
)

type Consumer struct {
	reader           *kafkago.Reader
	pool             *pgxpool.Pool
	telemetryRepo    repository.TelemetryRepository
	locoRepo         repository.LocomotiveRepository
	outboxRepo       repository.OutboxRepository
	alertSvc         *service.AlertService
	healthSvc        *service.HealthService
	snapshotInterval time.Duration
	lastSnapshot     map[int]time.Time
}

func NewConsumer(
	brokers []string,
	topic, groupID string,
	pool *pgxpool.Pool,
	telemetryRepo repository.TelemetryRepository,
	locoRepo repository.LocomotiveRepository,
	outboxRepo repository.OutboxRepository,
	alertSvc *service.AlertService,
	healthSvc *service.HealthService,
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
		pool:             pool,
		telemetryRepo:    telemetryRepo,
		locoRepo:         locoRepo,
		outboxRepo:       outboxRepo,
		alertSvc:         alertSvc,
		healthSvc:        healthSvc,
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
			continue // do NOT commit offset — let Kafka redeliver
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
		return nil // bad message, skip without retry
	}

	if t.Ts.IsZero() {
		t.Ts = time.Now().UTC()
	}

	// Fetch locomotive for power_type (outside tx — read-only)
	loco, err := c.locoRepo.GetByID(ctx, t.LocomotiveID)
	if err != nil {
		slog.Warn("kafka consumer: unknown locomotive", "id", t.LocomotiveID)
		return nil
	}

	// Fetch limits (outside tx — read-only)
	limits, err := c.telemetryRepo.GetLimits(ctx, t.LocomotiveID)
	if err != nil {
		slog.Warn("kafka consumer: no limits for locomotive", "id", t.LocomotiveID, "err", err)
		limits = &domain.TelemetryLimits{}
	}

	// Get active alert counts for health penalty (outside tx — read-only)
	warnings, _ := c.alertSvc.GetActiveCount(ctx, t.LocomotiveID, "warning")
	criticals, _ := c.alertSvc.GetActiveCount(ctx, t.LocomotiveID, "critical")

	// Calculate health
	status := healthcalc.Calculate(&t, limits, loco.PowerType, warnings, criticals)
	t.Health = &status.Score

	// --- Single transaction: all writes + outbox insert ---
	tx, err := c.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := c.telemetryRepo.UpsertCurrentTx(ctx, tx, &t); err != nil {
		return err
	}
	if err := c.telemetryRepo.InsertHistoryTx(ctx, tx, &t); err != nil {
		return err
	}

	createdAlerts, err := c.alertSvc.CheckAndCreateTx(ctx, tx, &t, limits)
	if err != nil {
		return err
	}

	// Build WS payload from data already in memory — no second DB read needed
	type alertSummary struct {
		ID        int64  `json:"id"`
		Parameter string `json:"parameter"`
		Severity  string `json:"severity"`
		Message   string `json:"message"`
	}
	alertSummaries := make([]alertSummary, 0, len(createdAlerts))
	for _, a := range createdAlerts {
		alertSummaries = append(alertSummaries, alertSummary{
			ID:        a.ID,
			Parameter: a.ParameterName,
			Severity:  a.Severity,
			Message:   a.Message,
		})
	}

	payloadBytes, err := json.Marshal(map[string]any{
		"type":          "telemetry",
		"locomotive_id": t.LocomotiveID,
		"ts":            t.Ts,
		"data":          t,
		"health":        status.Score,
		"alerts":        alertSummaries,
	})
	if err != nil {
		return err
	}

	if err := c.outboxRepo.InsertTx(ctx, tx, &domain.OutboxEntry{
		AggregateType: "telemetry",
		AggregateID:   t.LocomotiveID,
		EventType:     "telemetry.updated",
		Payload:       payloadBytes,
	}); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}
	// --- End transaction ---

	// Health snapshot: best-effort, outside transaction
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

	return nil
}
