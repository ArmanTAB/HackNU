CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    login         VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO users (login, password_hash)
VALUES ('login', '$2y$10$pKSA9QMZvyAyqzSVPatghOfSd3RDXyXB4w.fWo8wG3vsT1DKB.Qpi');
