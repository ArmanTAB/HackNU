package app

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/thedakeen/locomotive-twin/internal/config"
	"github.com/thedakeen/locomotive-twin/internal/service"
	"github.com/thedakeen/locomotive-twin/internal/simulator"

	infdb "github.com/thedakeen/locomotive-twin/internal/infrastructure/db"
	infkafka "github.com/thedakeen/locomotive-twin/internal/infrastructure/kafka"
	infrepo "github.com/thedakeen/locomotive-twin/internal/infrastructure/repository"
	infws "github.com/thedakeen/locomotive-twin/internal/infrastructure/ws"
	transphttp "github.com/thedakeen/locomotive-twin/internal/transport/http"
)

type App struct {
	cfg      *config.Config
	db       *pgxpool.Pool
	hub      *infws.Hub
	consumer *infkafka.Consumer
	producer *infkafka.Producer
	sim      *simulator.Simulator
	router   *transphttp.Router
}

func New(cfg *config.Config) (*App, error) {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	// DB
	ctx := context.Background()
	pool, err := infdb.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("app.New DB: %w", err)
	}

	// Migrations
	if err := infdb.RunMigrations(cfg.DatabaseURL, "internal/infrastructure/db/migrations"); err != nil {
		slog.Warn("migrations warning", "err", err)
	}

	// Repositories
	locoRepo := infrepo.NewLocomotivePg(pool)
	telRepo := infrepo.NewTelemetryPg(pool)
	alertRepo := infrepo.NewAlertPg(pool)
	eventRepo := infrepo.NewEventPg(pool)
	healthRepo := infrepo.NewHealthPg(pool)
	userRepo := infrepo.NewUserPg(pool)

	// Services
	locoSvc := service.NewLocomotiveService(locoRepo)
	telSvc := service.NewTelemetryService(telRepo)
	alertSvc := service.NewAlertService(alertRepo)
	eventSvc := service.NewEventService(eventRepo)
	healthSvc := service.NewHealthService(healthRepo)
	exportSvc := service.NewExportService(telRepo)
	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTExpiry)

	// WebSocket hub
	hub := infws.NewHub()

	// Kafka producer (for simulator)
	producer := infkafka.NewProducer(cfg.KafkaBrokers, cfg.KafkaTopicTelemetry)

	// Kafka consumer
	consumer := infkafka.NewConsumer(
		cfg.KafkaBrokers,
		cfg.KafkaTopicTelemetry,
		cfg.KafkaGroupID,
		telRepo,
		locoRepo,
		alertSvc,
		healthSvc,
		hub,
		cfg.HealthSnapshotInterval,
	)

	// HTTP router
	router := transphttp.NewRouter(pool, hub, locoSvc, telSvc, alertSvc, eventSvc, healthSvc, exportSvc, authSvc)

	var sim *simulator.Simulator
	if cfg.SimulatorEnabled {
		sim = simulator.New(cfg.SimulatorLocomotiveIDs, producer, cfg.SimulatorHz)
	}

	return &App{
		cfg:      cfg,
		db:       pool,
		hub:      hub,
		consumer: consumer,
		producer: producer,
		sim:      sim,
		router:   router,
	}, nil
}

func (a *App) Run(ctx context.Context) error {
	go a.hub.Run()
	go a.consumer.Run(ctx)

	if a.sim != nil {
		go a.sim.Run(ctx)
	}

	fiberApp := a.router.Setup()
	slog.Info("server starting", "port", a.cfg.Port)
	return fiberApp.Listen(":" + a.cfg.Port)
}

func (a *App) Shutdown(ctx context.Context) {
	slog.Info("shutting down")

	if err := a.consumer.Close(); err != nil {
		slog.Error("consumer close", "err", err)
	}
	if err := a.producer.Close(); err != nil {
		slog.Error("producer close", "err", err)
	}

	a.db.Close()
	slog.Info("shutdown complete")
}
