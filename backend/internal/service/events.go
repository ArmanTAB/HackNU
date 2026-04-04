package service

import (
	"context"
	"fmt"
	"time"

	"github.com/thedakeen/locomotive-twin/internal/domain"
	"github.com/thedakeen/locomotive-twin/internal/repository"
)

type EventService struct {
	repo repository.EventRepository
}

func NewEventService(repo repository.EventRepository) *EventService {
	return &EventService{repo: repo}
}

func (s *EventService) Create(ctx context.Context, e *domain.Event) (int64, error) {
	if e.Ts.IsZero() {
		e.Ts = time.Now().UTC()
	}
	id, err := s.repo.Insert(ctx, e)
	if err != nil {
		return 0, fmt.Errorf("event.Create: %w", err)
	}
	return id, nil
}

func (s *EventService) GetByLocomotive(ctx context.Context, locomotiveID int, from, to time.Time) ([]*domain.Event, error) {
	events, err := s.repo.GetByLocomotive(ctx, locomotiveID, from, to)
	if err != nil {
		return nil, fmt.Errorf("event.GetByLocomotive: %w", err)
	}
	return events, nil
}
