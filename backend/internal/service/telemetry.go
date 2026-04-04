package service

import (
	"context"
	"fmt"
	"time"

	"github.com/thedakeen/locomotive-twin/internal/domain"
	"github.com/thedakeen/locomotive-twin/internal/repository"
)

type TelemetryService struct {
	repo repository.TelemetryRepository
}

func NewTelemetryService(repo repository.TelemetryRepository) *TelemetryService {
	return &TelemetryService{repo: repo}
}

func (s *TelemetryService) GetCurrent(ctx context.Context, locomotiveID int) (*domain.Telemetry, error) {
	t, err := s.repo.GetCurrent(ctx, locomotiveID)
	if err != nil {
		return nil, fmt.Errorf("telemetry.GetCurrent: %w", err)
	}
	return t, nil
}

func (s *TelemetryService) GetHistory(ctx context.Context, locomotiveID int, from, to time.Time, limit int) ([]*domain.Telemetry, error) {
	result, err := s.repo.GetHistory(ctx, locomotiveID, from, to, limit)
	if err != nil {
		return nil, fmt.Errorf("telemetry.GetHistory: %w", err)
	}
	return result, nil
}

func (s *TelemetryService) GetLimits(ctx context.Context, locomotiveID int) (*domain.TelemetryLimits, error) {
	limits, err := s.repo.GetLimits(ctx, locomotiveID)
	if err != nil {
		return nil, fmt.Errorf("telemetry.GetLimits: %w", err)
	}
	return limits, nil
}

func (s *TelemetryService) UpdateLimits(ctx context.Context, limits *domain.TelemetryLimits) error {
	if err := s.repo.UpsertLimits(ctx, limits); err != nil {
		return fmt.Errorf("telemetry.UpdateLimits: %w", err)
	}
	return nil
}
