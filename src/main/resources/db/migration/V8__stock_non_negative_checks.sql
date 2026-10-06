-- V8: Database-level stock invariants.
--
-- Stock is guarded in the application (pessimistic row lock + FIFO consumption), but a bug,
-- a manual UPDATE or a future code path must not be able to drive it below zero silently.
-- The database is the last line of defence for these invariants.

ALTER TABLE product
    ADD CONSTRAINT chk_product_stock_non_negative CHECK (stock IS NULL OR stock >= 0);

ALTER TABLE stock_lot
    ADD CONSTRAINT chk_stock_lot_quantity_positive CHECK (quantity > 0),
    ADD CONSTRAINT chk_stock_lot_remaining_in_range CHECK (remaining_quantity >= 0 AND remaining_quantity <= quantity);
