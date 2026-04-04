CREATE TABLE outbox (
    id             BIGSERIAL PRIMARY KEY,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id   INT NOT NULL,
    event_type     VARCHAR(50) NOT NULL,
    payload        JSONB NOT NULL,
    processed      BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at   TIMESTAMPTZ
);

CREATE INDEX idx_outbox_unprocessed ON outbox (created_at ASC) WHERE processed = FALSE;
