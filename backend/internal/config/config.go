package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL            string
	KafkaBrokers           []string
	KafkaTopicTelemetry    string
	KafkaGroupID           string
	Port                   string
	WSPath                 string
	HealthSnapshotInterval int
	SimulatorLocomotiveIDs []int
	SimulatorHz            int
	SimulatorEnabled       bool

	JWTSecret string
	JWTExpiry int
}

func Load() (*Config, error) {
	_ = godotenv.Load(".env")

	cfg := &Config{
		DatabaseURL:            getEnv("DATABASE_URL", "postgres://user:password@localhost:5432/locomotive_db?sslmode=disable"),
		KafkaTopicTelemetry:    getEnv("KAFKA_TOPIC_TELEMETRY", "telemetry.raw"),
		KafkaGroupID:           getEnv("KAFKA_GROUP_ID", "backend-consumer"),
		Port:                   getEnv("PORT", "8080"),
		WSPath:                 getEnv("WS_PATH", "/ws"),
		HealthSnapshotInterval: getEnvInt("HEALTH_SNAPSHOT_INTERVAL", 5),
		SimulatorHz:            getEnvInt("SIMULATOR_HZ", 1),
		SimulatorEnabled:       getEnvBool("SIMULATOR_ENABLED", false),
		JWTSecret:              getEnv("JWT_SECRET", "jwt-secret"),
		JWTExpiry:              getEnvInt("JWT_EXPIRY_HOURS", 720),
	}

	brokersRaw := getEnv("KAFKA_BROKERS", "localhost:9092")
	for _, b := range strings.Split(brokersRaw, ",") {
		b = strings.TrimSpace(b)
		if b != "" {
			cfg.KafkaBrokers = append(cfg.KafkaBrokers, b)
		}
	}

	idsRaw := getEnv("SIMULATOR_LOCOMOTIVE_IDS", "1,2,3")
	for _, s := range strings.Split(idsRaw, ",") {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		id, err := strconv.Atoi(s)
		if err != nil {
			return nil, fmt.Errorf("config: invalid SIMULATOR_LOCOMOTIVE_IDS value %q: %w", s, err)
		}
		cfg.SimulatorLocomotiveIDs = append(cfg.SimulatorLocomotiveIDs, id)
	}

	return cfg, nil
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func getEnvBool(key string, def bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return def
	}
	return b
}
