package http

import (
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	fiberSwagger "github.com/gofiber/swagger"
	"github.com/jackc/pgx/v5/pgxpool"
	infraws "github.com/thedakeen/locomotive-twin/internal/infrastructure/ws"
	"github.com/thedakeen/locomotive-twin/internal/service"
)

type Router struct {
	app         *fiber.App
	db          *pgxpool.Pool
	hub         *infraws.Hub
	locoSvc     *service.LocomotiveService
	telSvc      *service.TelemetryService
	alertSvc    *service.AlertService
	eventSvc    *service.EventService
	healthSvc   *service.HealthService
	exportSvc   *service.ExportService
	authSvc     *service.AuthService
	authHandler *AuthHandler
}

func NewRouter(
	db *pgxpool.Pool,
	hub *infraws.Hub,
	locoSvc *service.LocomotiveService,
	telSvc *service.TelemetryService,
	alertSvc *service.AlertService,
	eventSvc *service.EventService,
	healthSvc *service.HealthService,
	exportSvc *service.ExportService,
	authSvc *service.AuthService,
) *Router {
	return &Router{
		app:         fiber.New(fiber.Config{AppName: "Locomotive Twin"}),
		db:          db,
		hub:         hub,
		locoSvc:     locoSvc,
		telSvc:      telSvc,
		alertSvc:    alertSvc,
		eventSvc:    eventSvc,
		healthSvc:   healthSvc,
		exportSvc:   exportSvc,
		authSvc:     authSvc,
		authHandler: NewAuthHandler(authSvc),
	}
}

func (r *Router) Setup() *fiber.App {
	r.app.Use(recover.New())
	r.app.Use(logger.New())
	r.app.Use(cors.New(cors.Config{AllowOrigins: "*"}))

	// Swagger UI (public)
	r.app.Get("/swagger/*", fiberSwagger.HandlerDefault)

	// Auth endpoints (public — registered before JWT middleware)
	auth := r.app.Group("/api/v1/auth")
	auth.Post("/register", r.authHandler.Register)
	auth.Post("/login", r.authHandler.Login)

	// All remaining routes require a valid JWT
	r.app.Use(JWTMiddleware(r.authSvc))

	// Healthz
	r.app.Get("/healthz", r.healthz)

	// WebSocket upgrade middleware
	r.app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	r.app.Get("/ws", websocket.New(r.handleWS))

	api := r.app.Group("/api/v1")

	// Locomotives
	loco := api.Group("/locomotives")
	loco.Get("/", r.listLocomotives)
	loco.Get("/:id", r.getLocomotive)

	// Telemetry
	loco.Get("/:id/telemetry/current", r.getCurrentTelemetry)
	loco.Get("/:id/telemetry/history", r.getHistoryTelemetry)

	// Health
	loco.Get("/:id/health/history", r.getHealthHistory)

	// Limits
	loco.Get("/:id/limits", r.getLimits)
	loco.Put("/:id/limits", r.updateLimits)

	// Alerts
	loco.Get("/:id/alerts", r.getAlerts)
	loco.Post("/:id/alerts/:alert_id/acknowledge", r.acknowledgeAlert)

	// Events
	loco.Get("/:id/events", r.getEvents)
	loco.Post("/:id/events", r.createEvent)

	// Export
	loco.Get("/:id/export/csv", r.exportCSV)

	return r.app
}

func (r *Router) handleWS(c *websocket.Conn) {
	locomotiveIDStr := c.Query("locomotive_id")
	locomotiveID := 0
	if locomotiveIDStr != "all" && locomotiveIDStr != "" {
		for _, b := range locomotiveIDStr {
			if b < '0' || b > '9' {
				c.Close()
				return
			}
		}
		var id int
		for _, b := range locomotiveIDStr {
			id = id*10 + int(b-'0')
		}
		locomotiveID = id
	}
	r.hub.ServeWS(c, locomotiveID)
}

// healthz godoc
// @Summary      Health check
// @Description  Returns 200 if DB is reachable, 503 otherwise
// @Tags         system
// @Produce      json
// @Success      200  {object}  map[string]string
// @Failure      503  {object}  map[string]string
// @Security     BearerAuth
// @Router       /healthz [get]
func (r *Router) healthz(c *fiber.Ctx) error {
	if err := r.db.Ping(c.Context()); err != nil {
		return c.Status(503).JSON(fiber.Map{"status": "error", "detail": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}
