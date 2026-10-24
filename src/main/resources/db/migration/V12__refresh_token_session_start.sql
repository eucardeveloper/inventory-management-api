-- =============================================================================
-- V12 - Absolute session limit: remember when the sign-in (not the last refresh) started
-- =============================================================================
-- Additive only: existing rows get "now" (UTC), so a session open during the upgrade
-- gets a full new window instead of being cut off.
ALTER TABLE refresh_token
    ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC');
