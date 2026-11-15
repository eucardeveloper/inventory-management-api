-- A stock lot is opened by exactly one receipt, and a reversal of that receipt finds the lot through
-- stock_lot.source_movement_id (findBySourceMovementIdForUpdate expects a single row). Until now nothing in the
-- database guarded that link: a lot could point at a movement that does not exist, and two lots could point
-- at the same one.
--
-- Additive only: no data is changed or removed. The statements fail, loudly, if existing data already breaks
-- the rule (the bundled demo data was checked and does not). Lots from before the link existed keep a NULL
-- source_movement_id; any number of those is still allowed, because the unique index ignores NULLs.

ALTER TABLE stock_lot
    ADD CONSTRAINT fk_stock_lot_source_movement
        FOREIGN KEY (source_movement_id) REFERENCES stock_movement (id);

CREATE UNIQUE INDEX uq_stock_lot_source_movement
    ON stock_lot (source_movement_id)
    WHERE source_movement_id IS NOT NULL;

-- The plain partial index from V10 is now redundant: the unique index serves the same lookups.
DROP INDEX IF EXISTS idx_stock_lot_source_movement;
