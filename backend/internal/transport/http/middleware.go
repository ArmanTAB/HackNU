package http

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/thedakeen/locomotive-twin/internal/service"
)

func JWTMiddleware(authSvc *service.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing authorization header"})
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid authorization header format"})
		}

		userID, login, err := authSvc.ValidateToken(parts[1])
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid or expired token"})
		}

		c.Locals("userID", userID)
		c.Locals("login", login)
		return c.Next()
	}
}
