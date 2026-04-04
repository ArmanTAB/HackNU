package service

import (
	"context"
	"fmt"
	"time"

	"github.com/thedakeen/locomotive-twin/internal/domain"
	"github.com/thedakeen/locomotive-twin/internal/repository"
)

type HealthService struct {
	repo repository.HealthRepository
}

func NewHealthService(repo repository.HealthRepository) *HealthService {
	return &HealthService{repo: repo}
}

func (s *HealthService) GetHistory(ctx context.Context, locomotiveID int, from, to time.Time) ([]*domain.HealthSnapshot, error) {
	snapshots, err := s.repo.GetSnapshots(ctx, locomotiveID, from, to)
	if err != nil {
		return nil, fmt.Errorf("health.GetHistory: %w", err)
	}
	return snapshots, nil
}

func (s *HealthService) InsertSnapshot(ctx context.Context, snap *domain.HealthSnapshot) error {
	if err := s.repo.InsertSnapshot(ctx, snap); err != nil {
		return fmt.Errorf("health.InsertSnapshot: %w", err)
	}
	return nil
}
