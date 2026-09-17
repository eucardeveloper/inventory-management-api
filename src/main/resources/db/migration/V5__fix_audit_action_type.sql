-- =============================================================================
-- V5: Fix audit_log.action column type
-- PostgreSQL native ENUM requires explicit casting from Hibernate's VARCHAR binding.
-- Converting to VARCHAR(40) removes the mismatch and lets Hibernate insert directly.
-- =============================================================================

ALTER TABLE audit_log
    ALTER COLUMN action TYPE VARCHAR(40) USING action::text;

DROP TYPE IF EXISTS audit_action;
