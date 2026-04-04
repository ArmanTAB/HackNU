package outbox

import (
	"context"
	"log/slog"
	"time"

	"github.com/thedakeen/locomotive-twin/internal/infrastructure/ws"
	"github.com/thedakeen/locomotive-twin/internal/repository"
)

type Relay struct {
	outboxRepo repository.OutboxRepository
	hub        *ws.Hub
	interval   time.Duration
	batchSize  int
}

func NewRelay(repo repository.OutboxRepository, hub *ws.Hub, interval time.Duration, batchSize int) *Relay {
	return &Relay{
		outboxRepo: repo,
		hub:        hub,
		interval:   interval,
		batchSize:  batchSize,
	}
}

func (r *Relay) Run(ctx context.Context) {
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.processBatch(ctx)
		}
	}
}

func (r *Relay) processBatch(ctx context.Context) {
	entries, err := r.outboxRepo.FetchUnprocessed(ctx, r.batchSize)
	if err != nil {
		slog.Error("outbox relay fetch", "err", err)
		return
	}
	if len(entries) == 0 {
		return
	}

	ids := make([]int64, 0, len(entries))
	for _, e := range entries {
		r.hub.Broadcast(ws.BroadcastMsg{LocomotiveID: e.AggregateID, Payload: e.Payload})
		ids = append(ids, e.ID)
	}

	if err := r.outboxRepo.MarkProcessed(ctx, ids); err != nil {
		slog.Error("outbox relay mark processed", "err", err)
		// entries will be re-delivered on next tick; hub.Broadcast is best-effort
	}
}
