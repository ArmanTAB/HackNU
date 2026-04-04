package http

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/thedakeen/locomotive-twin/internal/domain"
	"github.com/thedakeen/locomotive-twin/internal/service"
)

type AuthHandler struct {
	authSvc *service.AuthService
}

func NewAuthHandler(authSvc *service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc}
}

// Register godoc
// @Summary      Register a new user
// @Description  Creates a new user account and returns a JWT token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.RegisterRequest  true  "Login and password"
// @Success      200   {object}  domain.AuthResponse
// @Failure      400   {object}  map[string]string
// @Failure      409   {object}  map[string]string  "Login already taken"
// @Router       /auth/register [post]
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req domain.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	resp, err := h.authSvc.Register(c.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrLoginTaken) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "login already taken"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

// Login godoc
// @Summary      Login
// @Description  Authenticates a user and returns a JWT token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.LoginRequest  true  "Login and password"
// @Success      200   {object}  domain.AuthResponse
// @Failure      400   {object}  map[string]string
// @Failure      401   {object}  map[string]string  "Invalid credentials"
// @Router       /auth/login [post]
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req domain.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	resp, err := h.authSvc.Login(c.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid login or password"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}
