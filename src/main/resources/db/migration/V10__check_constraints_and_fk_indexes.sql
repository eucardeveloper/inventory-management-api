-- V10: more database-level invariants and indexes on foreign keys.
--
-- V8 protects stock and lot quantities. This migration finishes the job for the rest of the ledger:
-- a movement always moves a positive number of units, and no price or cost may be negative.
-- The application validates all of this already; the constraints make sure a bug, a manual UPDATE
-- or a future code path cannot store such a row anyway.
--
-- The second half adds indexes on foreign-key columns that had none. Without them PostgreSQL scans
-- the whole child table when a parent row is deleted or joined (for example "all products of this
-- supplier", "all reversals of this movement", "every consumption of this lot").

-- ---------------------------------------------------------------------------
-- CHECK constraints
-- ---------------------------------------------------------------------------
ALTER TABLE stock_movement
    ADD CONSTRAINT chk_stock_movement_quantity_positive      CHECK (quantity > 0),
    ADD CONSTRAINT chk_stock_movement_unit_cost_non_negative CHECK (unit_cost IS NULL OR unit_cost >= 0),
    ADD CONSTRAINT chk_stock_movement_total_cost_non_negative CHECK (total_cost >= 0);

ALTER TABLE stock_lot
    ADD CONSTRAINT chk_stock_lot_unit_cost_non_negative CHECK (unit_cost >= 0);

ALTER TABLE movement_lot_consumption
    ADD CONSTRAINT chk_consumption_quantity_positive      CHECK (quantity_taken > 0),
    ADD CONSTRAINT chk_consumption_unit_cost_non_negative CHECK (unit_cost >= 0),
    ADD CONSTRAINT chk_consumption_line_cost_non_negative CHECK (line_cost >= 0);

ALTER TABLE product
    ADD CONSTRAINT chk_product_unit_price_non_negative    CHECK (unit_price IS NULL OR unit_price >= 0),
    ADD CONSTRAINT chk_product_reorder_level_non_negative CHECK (reorder_level IS NULL OR reorder_level >= 0);

-- ---------------------------------------------------------------------------
-- Indexes on foreign keys
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_product_supplier           ON product(supplier_id);
CREATE INDEX IF NOT EXISTS idx_movement_reversal_of       ON stock_movement(reversal_of_id) WHERE reversal_of_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consumption_lot            ON movement_lot_consumption(lot_id);
CREATE INDEX IF NOT EXISTS idx_stock_lot_source_movement  ON stock_lot(source_movement_id) WHERE source_movement_id IS NOT NULL;
