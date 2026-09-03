-- =============================================================================
-- V1 — Initial schema
-- Derived from JPA entity definitions. Flyway manages all DDL from this point;
-- spring.jpa.hibernate.ddl-auto=validate enforces that the DB matches entities.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- supplier
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier (
    id             BIGSERIAL    PRIMARY KEY,
    company_name   VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email          VARCHAR(255) NOT NULL UNIQUE,
    phone          VARCHAR(255)
);

-- ---------------------------------------------------------------------------
-- product
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product (
    id             BIGSERIAL       PRIMARY KEY,
    article_number VARCHAR(255)    UNIQUE,
    name           VARCHAR(255)    NOT NULL,
    description    TEXT,
    unit_price     NUMERIC(38, 2),
    stock          INTEGER,
    reorder_level  INTEGER,
    active         BOOLEAN         NOT NULL DEFAULT TRUE,
    supplier_id    BIGINT          REFERENCES supplier(id)
);

CREATE INDEX IF NOT EXISTS idx_product_article_number ON product(article_number);
CREATE INDEX IF NOT EXISTS idx_product_active          ON product(active);

-- ---------------------------------------------------------------------------
-- app_user
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_user (
    id       BIGSERIAL    PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role     VARCHAR(50)
);

-- ---------------------------------------------------------------------------
-- stock_movement
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movement (
    id               BIGSERIAL       PRIMARY KEY,
    product_id       BIGINT          NOT NULL REFERENCES product(id),
    quantity         INTEGER         NOT NULL,
    movement_type    VARCHAR(20)     NOT NULL,
    unit_cost        NUMERIC(19, 4),
    total_cost       NUMERIC(19, 4)  NOT NULL,
    occurred_at      TIMESTAMP       NOT NULL,
    performed_by     VARCHAR(100)    NOT NULL,
    idempotency_key  VARCHAR(100)    UNIQUE,
    reversal_of_id   BIGINT          REFERENCES stock_movement(id),
    reversed_by_id   BIGINT,
    reason_code      VARCHAR(50),
    stock_after      INTEGER         NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_movement_product_date ON stock_movement(product_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_movement_occurred      ON stock_movement(occurred_at);
-- ---------------------------------------------------------------------------
-- stock_lot
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_lot (
    id                 BIGSERIAL      PRIMARY KEY,
    product_id         BIGINT         NOT NULL REFERENCES product(id),
    quantity           INTEGER        NOT NULL,
    remaining_quantity INTEGER        NOT NULL,
    unit_cost          NUMERIC(19, 4) NOT NULL,
    received_at        TIMESTAMP      NOT NULL,
    source_movement_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_stock_lot_product_received ON stock_lot(product_id, received_at);
CREATE INDEX IF NOT EXISTS idx_stock_lot_remaining         ON stock_lot(remaining_quantity);

-- ---------------------------------------------------------------------------
-- movement_lot_consumption
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movement_lot_consumption (
    id             BIGSERIAL      PRIMARY KEY,
    movement_id    BIGINT         NOT NULL REFERENCES stock_movement(id),
    lot_id         BIGINT         NOT NULL,
    quantity_taken INTEGER        NOT NULL,
    unit_cost      NUMERIC(19, 4) NOT NULL,
    line_cost      NUMERIC(19, 4) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consumption_movement ON movement_lot_consumption(movement_id);
