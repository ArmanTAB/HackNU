package domain

import "time"

type User struct {
	ID           int64
	Login        string
	PasswordHash string
	CreatedAt    time.Time
}

type RegisterRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
}
