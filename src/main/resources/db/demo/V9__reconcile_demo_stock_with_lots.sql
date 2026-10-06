-- V9 (demo data only): make the demo products satisfy the inventory invariant
--   product.stock = SUM(stock_lot.remaining_quantity)
--
-- The earlier demo seed booked OUT movements in the ledger and updated product.stock, but never
-- consumed the matching FIFO lots, so for some products the lots still showed more units than
-- the ledger. The lots are the source of truth, so the units already shipped according to the
-- ledger are now consumed from the oldest lots first (FIFO), exactly like a real OUT movement.

DO $$
DECLARE
    prod      RECORD;
    lot       RECORD;
    excess    INTEGER;
    take      INTEGER;
BEGIN
    FOR prod IN
        SELECT p.id,
               COALESCE((SELECT SUM(l.remaining_quantity) FROM stock_lot l WHERE l.product_id = p.id), 0) - p.stock AS excess_units
        FROM   product p
        WHERE  p.stock IS NOT NULL
    LOOP
        excess := prod.excess_units;
        IF excess > 0 THEN
            FOR lot IN
                SELECT id, remaining_quantity
                FROM   stock_lot
                WHERE  product_id = prod.id AND remaining_quantity > 0
                ORDER  BY received_at, id
            LOOP
                EXIT WHEN excess = 0;
                take := LEAST(excess, lot.remaining_quantity);
                UPDATE stock_lot SET remaining_quantity = remaining_quantity - take WHERE id = lot.id;
                excess := excess - take;
            END LOOP;
        END IF;
    END LOOP;
END $$;
