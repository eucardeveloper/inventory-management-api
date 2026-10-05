-- Integrity constraints for data written outside the application.
ALTER TABLE stock_movement
    ADD CONSTRAINT chk_stock_movement_quantity_positive CHECK (quantity > 0),
    ADD CONSTRAINT chk_stock_movement_type CHECK (movement_type IN ('IN', 'OUT')),
    ADD CONSTRAINT chk_stock_movement_stock_after_nonnegative CHECK (stock_after >= 0);

ALTER TABLE stock_lot
    ADD CONSTRAINT chk_stock_lot_quantity_positive CHECK (quantity > 0),
    ADD CONSTRAINT chk_stock_lot_remaining_nonnegative CHECK (remaining_quantity >= 0),
    ADD CONSTRAINT chk_stock_lot_remaining_within_quantity
        CHECK (remaining_quantity <= quantity);

ALTER TABLE movement_lot_consumption
    ADD CONSTRAINT chk_consumption_quantity_positive CHECK (quantity_taken > 0);

CREATE UNIQUE INDEX uq_stock_movement_reversal_of
    ON stock_movement (reversal_of_id)
    WHERE reversal_of_id IS NOT NULL;
