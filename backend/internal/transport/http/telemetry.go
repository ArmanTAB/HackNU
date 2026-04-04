package http

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

// getCurrentTelemetry godoc
// @Summary      Get current telemetry
// @Description  Returns the latest telemetry snapshot for a locomotive
// @Tags         telemetry
// @Produce      json
// @Param        id   path      int  true  "Locomotive ID"
// @Success      200  {object}  domain.Telemetry
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Router       /locomotives/{id}/telemetry/current [get]
func (r *Router) getCurrentTelemetry(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}
	t, err := r.telSvc.GetCurrent(c.Context(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(t)
}

// getHistoryTelemetry godoc
// @Summary      Get telemetry history
// @Description  Returns historical telemetry records for a locomotive within a time range
// @Tags         telemetry
// @Produce      json
// @Param        id     path      int     true   "Locomotive ID"
// @Param        from   query     string  false  "Start time (RFC3339), default: 1h ago"
// @Param        to     query     string  false  "End time (RFC3339), default: now"
// @Param        limit  query     int     false  "Max records (default 1000)"
// @Success      200    {array}   domain.Telemetry
// @Failure      400    {object}  map[string]string
// @Failure      500    {object}  map[string]string
// @Router       /locomotives/{id}/telemetry/history [get]
func (r *Router) getHistoryTelemetry(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	from, to, limit, err := parseTimeRange(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	records, err := r.telSvc.GetHistory(c.Context(), id, from, to, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if records == nil {
		records = []*domain.Telemetry{}
	}
	return c.JSON(records)
}

// getLimits godoc
// @Summary      Get telemetry limits
// @Description  Returns all warning and critical thresholds configured for a locomotive
// @Tags         telemetry
// @Produce      json
// @Param        id   path      int  true  "Locomotive ID"
// @Success      200  {object}  domain.TelemetryLimits
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Router       /locomotives/{id}/limits [get]
func (r *Router) getLimits(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}
	limits, err := r.telSvc.GetLimits(c.Context(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(limits)
}

// updateLimits godoc
// @Summary      Update telemetry limits
// @Description  Updates warning and critical thresholds for a locomotive (takes effect immediately)
// @Tags         telemetry
// @Accept       json
// @Produce      json
// @Param        id      path      int                    true  "Locomotive ID"
// @Param        limits  body      domain.TelemetryLimits  true  "Limits payload"
// @Success      200     {object}  map[string]bool
// @Failure      400     {object}  map[string]string
// @Failure      500     {object}  map[string]string
// @Router       /locomotives/{id}/limits [put]
func (r *Router) updateLimits(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var limits domain.TelemetryLimits
	if err := c.BodyParser(&limits); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	limits.LocomotiveID = id

	if err := r.telSvc.UpdateLimits(c.Context(), &limits); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true})
}

// getHealthHistory godoc
// @Summary      Get health score history
// @Description  Returns health snapshot history for a locomotive, downsampled to 1 point per minute
// @Tags         health
// @Produce      json
// @Param        id    path      int     true   "Locomotive ID"
// @Param        from  query     string  false  "Start time (RFC3339), default: 1h ago"
// @Param        to    query     string  false  "End time (RFC3339), default: now"
// @Success      200   {array}   domain.HealthSnapshot
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /locomotives/{id}/health/history [get]
func (r *Router) getHealthHistory(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	from, to, _, err := parseTimeRange(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	snapshots, err := r.healthSvc.GetHistory(c.Context(), id, from, to)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if snapshots == nil {
		snapshots = []*domain.HealthSnapshot{}
	}
	return c.JSON(snapshots)
}

func parseTimeRange(c *fiber.Ctx) (from, to time.Time, limit int, err error) {
	fromStr := c.Query("from")
	toStr := c.Query("to")
	limitStr := c.Query("limit", "1000")

	from = time.Now().Add(-1 * time.Hour)
	to = time.Now()

	if fromStr != "" {
		from, err = time.Parse(time.RFC3339, fromStr)
		if err != nil {
			return
		}
	}
	if toStr != "" {
		to, err = time.Parse(time.RFC3339, toStr)
		if err != nil {
			return
		}
	}

	limit, err = strconv.Atoi(limitStr)
	if err != nil {
		limit = 1000
		err = nil
	}
	return
}
