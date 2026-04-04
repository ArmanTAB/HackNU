package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/thedakeen/locomotive-twin/internal/domain"
)

// listLocomotives godoc
// @Summary      List all locomotives
// @Description  Returns all locomotives with their current status
// @Tags         locomotives
// @Produce      json
// @Success      200  {array}   domain.Locomotive
// @Failure      500  {object}  map[string]string
// @Security     BearerAuth
// @Router       /locomotives [get]
func (r *Router) listLocomotives(c *fiber.Ctx) error {
	locos, err := r.locoSvc.GetAll(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if locos == nil {
		locos = []*domain.Locomotive{}
	}
	return c.JSON(locos)
}

// getLocomotive godoc
// @Summary      Get locomotive by ID
// @Description  Returns a single locomotive by its ID
// @Tags         locomotives
// @Produce      json
// @Param        id   path      int  true  "Locomotive ID"
// @Success      200  {object}  domain.Locomotive
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /locomotives/{id} [get]
func (r *Router) getLocomotive(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}
	loco, err := r.locoSvc.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(loco)
}
