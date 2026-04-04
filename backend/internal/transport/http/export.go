package http

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// exportCSV godoc
// @Summary      Export telemetry as CSV
// @Description  Downloads a CSV file containing historical telemetry for a locomotive
// @Tags         export
// @Produce      text/csv
// @Param        id    path      int     true   "Locomotive ID"
// @Param        from  query     string  false  "Start time (RFC3339), default: 1h ago"
// @Param        to    query     string  false  "End time (RFC3339), default: now"
// @Success      200   {string}  string  "CSV file"
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Security     BearerAuth
// @Router       /locomotives/{id}/export/csv [get]
func (r *Router) exportCSV(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	from, to, _, err := parseTimeRange(c)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="locomotive_%d_telemetry.csv"`, id))

	return r.exportSvc.ExportCSV(c.Context(), id, from, to, c.Response().BodyWriter())
}
