package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

// getAlerts godoc
// @Summary      List alerts
// @Description  Returns alerts for a locomotive. Filter by active status and/or severity.
// @Tags         alerts
// @Produce      json
// @Param        id        path      int     true   "Locomotive ID"
// @Param        active    query     bool    false  "Only unacknowledged alerts"
// @Param        severity  query     string  false  "Filter by severity: warning or critical"
// @Success      200       {array}   domain.Alert
// @Failure      400       {object}  map[string]string
// @Failure      500       {object}  map[string]string
// @Router       /locomotives/{id}/alerts [get]
func (r *Router) getAlerts(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	activeOnly := c.Query("active") == "true"
	severity := c.Query("severity")

	alerts, err := r.alertSvc.GetAlerts(c.Context(), id, activeOnly, severity)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if alerts == nil {
		alerts = []*domain.Alert{}
	}
	return c.JSON(alerts)
}

// acknowledgeAlert godoc
// @Summary      Acknowledge an alert
// @Description  Marks an alert as acknowledged by the dispatcher
// @Tags         alerts
// @Accept       json
// @Produce      json
// @Param        id        path      int                      true  "Locomotive ID"
// @Param        alert_id  path      int                      true  "Alert ID"
// @Param        body      body      object{acknowledged_by=string}  false  "Acknowledger name"
// @Success      200       {object}  map[string]bool
// @Failure      400       {object}  map[string]string
// @Failure      500       {object}  map[string]string
// @Router       /locomotives/{id}/alerts/{alert_id}/acknowledge [post]
func (r *Router) acknowledgeAlert(c *fiber.Ctx) error {
	alertID, err := strconv.ParseInt(c.Params("alert_id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid alert_id"})
	}

	var body struct {
		AcknowledgedBy string `json:"acknowledged_by"`
	}
	_ = c.BodyParser(&body)
	if body.AcknowledgedBy == "" {
		body.AcknowledgedBy = "dispatcher"
	}

	if err := r.alertSvc.Acknowledge(c.Context(), alertID, body.AcknowledgedBy); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true})
}
