package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/thedakeen/locomotive-twin/internal/domain"
	"github.com/thedakeen/locomotive-twin/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid login or password")
var ErrLoginTaken = errors.New("login already taken")

type claims struct {
	UserID int64  `json:"user_id"`
	Login  string `json:"login"`
	jwt.RegisteredClaims
}

type AuthService struct {
	users     repository.UserRepository
	jwtSecret []byte
	jwtExpiry time.Duration
}

func NewAuthService(users repository.UserRepository, secret string, expiryHours int) *AuthService {
	return &AuthService{
		users:     users,
		jwtSecret: []byte(secret),
		jwtExpiry: time.Duration(expiryHours) * time.Hour,
	}
}

func (s *AuthService) Register(ctx context.Context, req domain.RegisterRequest) (*domain.AuthResponse, error) {
	if req.Login == "" || req.Password == "" {
		return nil, fmt.Errorf("auth.Register: login and password required")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("auth.Register bcrypt: %w", err)
	}

	user, err := s.users.Create(ctx, req.Login, string(hash))
	if err != nil {
		// pgx unique violation code
		if isDuplicateKeyError(err) {
			return nil, ErrLoginTaken
		}
		return nil, fmt.Errorf("auth.Register: %w", err)
	}

	token, err := s.issueToken(user.ID, user.Login)
	if err != nil {
		return nil, err
	}
	return &domain.AuthResponse{Token: token}, nil
}

func (s *AuthService) Login(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, error) {
	if req.Login == "" || req.Password == "" {
		return nil, fmt.Errorf("auth.Login: login and password required")
	}

	user, err := s.users.FindByLogin(ctx, req.Login)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := s.issueToken(user.ID, user.Login)
	if err != nil {
		return nil, err
	}
	return &domain.AuthResponse{Token: token}, nil
}

func (s *AuthService) ValidateToken(tokenStr string) (userID int64, login string, err error) {
	t, err := jwt.ParseWithClaims(tokenStr, &claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return 0, "", fmt.Errorf("auth.ValidateToken: %w", err)
	}

	c, ok := t.Claims.(*claims)
	if !ok || !t.Valid {
		return 0, "", fmt.Errorf("auth.ValidateToken: invalid token claims")
	}
	return c.UserID, c.Login, nil
}

func (s *AuthService) issueToken(userID int64, login string) (string, error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, &claims{
		UserID: userID,
		Login:  login,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.jwtExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})
	signed, err := t.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("auth.issueToken: %w", err)
	}
	return signed, nil
}

// isDuplicateKeyError checks for PostgreSQL unique violation (code 23505).
func isDuplicateKeyError(err error) bool {
	return err != nil && (containsCode(err.Error(), "23505") || containsCode(err.Error(), "duplicate key"))
}

func containsCode(s, code string) bool {
	return len(s) >= len(code) && (s == code || len(s) > 0 && containsSubstr(s, code))
}

func containsSubstr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
