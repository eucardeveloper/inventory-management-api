-- =============================================================================
-- V3 — Refresh token table for secure HttpOnly cookie auth
-- =============================================================================

CREATE TABLE IF NOT EXISTS refresh_token (
    id          BIGSERIAL    PRIMARY KEY,
    token_hash  VARCHAR(100) NOT NULL UNIQUE,
    user_id     BIGINT       NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    expires_at  TIMESTAMP    NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON refresh_token(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expires ON refresh_token(expires_at);

-- Add optimistic lock version column to product (for concurrent master-data updates)
ALTER TABLE product ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
