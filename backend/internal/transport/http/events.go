package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

// getEvents godoc
// @Summary      List events
// @Description  Returns manual events (incidents, maintenance notes) for a locomotive
// @Tags         events
// @Produce      json
// @Param        id    path      int     true   "Locomotive ID"
// @Param        from  query     string  false  "Start time (RFC3339), default: 1h ago"
// @Param        to    query     string  false  "End time (RFC3339), default: now"
// @Success      200   {array}   domain.Event
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Security     BearerAuth
// @Router       /locomotives/{id}/events [get]
func (r *Router) getEvents(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	from, to, _, err := parseTimeRange(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	events, err := r.eventSvc.GetByLocomotive(c.Context(), id, from, to)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if events == nil {
		events = []*domain.Event{}
	}
	return c.JSON(events)
}

// createEvent godoc
// @Summary      Create manual event
// @Description  Records a manual event (incident, maintenance, note) for a locomotive
// @Tags         events
// @Accept       json
// @Produce      json
// @Param        id     path      int           true  "Locomotive ID"
// @Param        event  body      domain.Event  true  "Event payload"
// @Success      201    {object}  domain.Event
// @Failure      400    {object}  map[string]string
// @Failure      500    {object}  map[string]string
// @Security     BearerAuth
// @Router       /locomotives/{id}/events [post]
func (r *Router) createEvent(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var ev domain.Event
	if err := c.BodyParser(&ev); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	ev.LocomotiveID = id

	newID, err := r.eventSvc.Create(c.Context(), &ev)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	ev.ID = newID
	return c.Status(201).JSON(ev)
}
