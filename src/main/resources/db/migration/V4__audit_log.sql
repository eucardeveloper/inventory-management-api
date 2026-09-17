-- =============================================================================
-- V4: Audit Log
-- Immutable append-only table — rows are inserted once and never updated.
-- =============================================================================

CREATE TYPE audit_action AS ENUM (
    'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTER', 'TOKEN_REFRESHED',
    'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DEACTIVATED',
    'SUPPLIER_CREATED', 'SUPPLIER_UPDATED', 'SUPPLIER_DELETED',
    'STOCK_IN', 'STOCK_OUT', 'STOCK_ADJUSTED'
);

CREATE TABLE IF NOT EXISTS audit_log (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       REFERENCES app_user(id) ON DELETE SET NULL,
    username     VARCHAR(100),
    action       audit_action NOT NULL,
    entity_type  VARCHAR(80),
    entity_id    VARCHAR(40),
    old_value    TEXT,
    new_value    TEXT,
    ip_address   VARCHAR(45),
    description  VARCHAR(500),
    occurred_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance indexes for common filter patterns
CREATE INDEX IF NOT EXISTS idx_audit_user_id     ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity      ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_occurred_at ON audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action      ON audit_log(action);
