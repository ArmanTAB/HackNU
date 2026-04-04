package service

import (
	"context"
	"fmt"

	"github.com/thedakeen/locomotive-twin/internal/domain"
	"github.com/thedakeen/locomotive-twin/internal/repository"
)

type LocomotiveService struct {
	repo repository.LocomotiveRepository
}

func NewLocomotiveService(repo repository.LocomotiveRepository) *LocomotiveService {
	return &LocomotiveService{repo: repo}
}

func (s *LocomotiveService) GetAll(ctx context.Context) ([]*domain.Locomotive, error) {
	locos, err := s.repo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("locomotive.GetAll: %w", err)
	}
	return locos, nil
}

func (s *LocomotiveService) GetByID(ctx context.Context, id int) (*domain.Locomotive, error) {
	l, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("locomotive.GetByID: %w", err)
	}
	return l, nil
}
