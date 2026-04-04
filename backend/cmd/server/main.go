// @title           Locomotive Digital Twin API
// @version         1.0
// @description     Real-time telemetry dashboard for locomotive dispatchers and drivers.
// @host            localhost:8080
// @BasePath        /api/v1
// @schemes         http

package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/thedakeen/locomotive-twin/docs"
	"github.com/thedakeen/locomotive-twin/internal/app"
	"github.com/thedakeen/locomotive-twin/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("config load", "err", err)
		os.Exit(1)
	}

	application, err := app.New(cfg)
	if err != nil {
		slog.Error("app init", "err", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		if err := application.Run(ctx); err != nil {
			slog.Error("app run", "err", err)
			cancel()
		}
	}()

	<-quit
	slog.Info("signal received, shutting down")
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()
	application.Shutdown(shutdownCtx)
}
