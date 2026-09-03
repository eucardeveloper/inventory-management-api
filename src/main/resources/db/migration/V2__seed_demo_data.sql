-- =============================================================================
-- V2 — Demo seed data
-- Runs automatically on first startup (Docker Compose or local dev).
-- Passwords are BCrypt hashes:
--   admin        → admin123
--   warehouse    → warehouse123
--   staff        → staff123
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
INSERT INTO app_user (username, password, role) VALUES
    ('admin',     '$2a$10$FTVD1sipDNLiVYqeT/d8OeMAPrsqe5yng9Fkp.FQE8a1RcK0fTD3O', 'ADMIN'),
    ('warehouse', '$2a$10$f5t8dnwa0elwBWTcwOvE4uYwkdR75IDJf92wbNs9SIItPmxtA3mJ.', 'WAREHOUSE_MANAGER'),
    ('staff',     '$2a$10$AV2hIimXePzVh.4z5/U3BeKceowwyggf5wDeTAr.Vn8omUtmU4yui', 'STAFF')
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------------
INSERT INTO supplier (company_name, contact_person, email, phone) VALUES
    ('TechParts GmbH',      'Hans Müller',    'hans.muller@techparts.de',    '+49-30-1234567'),
    ('ElectroSupply Ltd.',  'Sarah Johnson',  'sarah.j@electrosupply.co.uk', '+44-20-9876543'),
    ('Global Components',   'Li Wei',         'liwei@globalcomp.cn',         '+86-21-5551234'),
    ('Nordic Hardware AS',  'Erik Larsen',    'erik@nordichw.no',            '+47-22-445566')
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'ART-001', 'Arduino Uno Rev3',
       'Microcontroller board based on ATmega328P. 14 digital I/O pins.',
       12.50, 0, 20, TRUE, s.id
FROM supplier s WHERE s.email = 'hans.muller@techparts.de'
ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'ART-002', 'Raspberry Pi 4 Model B (4GB)',
       'Single-board computer, 4 GB RAM, dual-band Wi-Fi.',
       55.00, 0, 10, TRUE, s.id
FROM supplier s WHERE s.email = 'sarah.j@electrosupply.co.uk'
ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'ART-003', 'USB-C Cable 2m',
       'High-speed USB 3.2 Gen 2 cable, 100W PD, braided.',
       8.90, 0, 50, TRUE, s.id
FROM supplier s WHERE s.email = 'liwei@globalcomp.cn'
ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'ART-004', 'Heat Sink 40×40mm',
       'Aluminium heat sink for TO-220 packages. Thermal resistance 12°C/W.',
       2.20, 0, 100, TRUE, s.id
FROM supplier s WHERE s.email = 'erik@nordichw.no'
ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'ART-005', 'Soldering Iron Station 60W',
       'Temperature-controlled station, 200–480°C range, LCD display.',
       49.95, 0, 5, TRUE, s.id
FROM supplier s WHERE s.email = 'hans.muller@techparts.de'
ON CONFLICT (article_number) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Stock movements (IN) — first batch for each product
-- These also create stock_lot rows and update product.stock
-- We insert directly to keep the seed self-contained.
-- ---------------------------------------------------------------------------

-- ART-001: IN 50 units @ 9.80
WITH mv AS (
    INSERT INTO stock_movement
        (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 50, 'IN', 9.80, 50*9.80,
           '2025-01-10 08:00:00', 'admin', 'seed-in-001-a', 50
    FROM product p WHERE p.article_number = 'ART-001'
    RETURNING id, product_id
)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 50, 50, 9.80, '2025-01-10 08:00:00', mv.id FROM mv;

UPDATE product SET stock = 50 WHERE article_number = 'ART-001';

-- ART-001: second IN 30 units @ 10.20 (price went up)
WITH mv AS (
    INSERT INTO stock_movement
        (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 30, 'IN', 10.20, 30*10.20,
           '2025-03-05 09:30:00', 'warehouse', 'seed-in-001-b', 80
    FROM product p WHERE p.article_number = 'ART-001'
    RETURNING id, product_id
)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 30, 30, 10.20, '2025-03-05 09:30:00', mv.id FROM mv;

UPDATE product SET stock = 80 WHERE article_number = 'ART-001';

-- ART-001: OUT 20 units (FIFO: 20 from first lot @ 9.80, total_cost=196.00)
WITH mv AS (
    INSERT INTO stock_movement
        (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 20, 'OUT', NULL, 196.00,
           '2025-04-12 14:00:00', 'staff', 'seed-out-001-a', 60
    FROM product p WHERE p.article_number = 'ART-001'
    RETURNING id, product_id
),
lot AS (
    SELECT sl.id AS lot_id FROM stock_lot sl
    JOIN product p ON p.id = sl.product_id
    WHERE p.article_number = 'ART-001'
    ORDER BY sl.received_at ASC LIMIT 1
)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 20, 9.80, 196.00 FROM mv, lot;

UPDATE stock_lot SET remaining_quantity = remaining_quantity - 20
WHERE id = (SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id
            WHERE p.article_number='ART-001' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 60 WHERE article_number = 'ART-001';

-- ART-002: IN 25 units @ 42.00
WITH mv AS (
    INSERT INTO stock_movement
        (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 25, 'IN', 42.00, 25*42.00,
           '2025-02-01 10:00:00', 'admin', 'seed-in-002-a', 25
    FROM product p WHERE p.article_number = 'ART-002'
    RETURNING id, product_id
)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 25, 25, 42.00, '2025-02-01 10:00:00', mv.id FROM mv;

UPDATE product SET stock = 25 WHERE article_number = 'ART-002';

-- ART-003: IN 200 units @ 3.50
WITH mv AS (
    INSERT INTO stock_movement
        (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 200, 'IN', 3.50, 200*3.50,
           '2025-01-20 11:00:00', 'warehouse', 'seed-in-003-a', 200
    FROM product p WHERE p.article_number = 'ART-003'
    RETURNING id, product_id
)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 200, 200, 3.50, '2025-01-20 11:00:00', mv.id FROM mv;

UPDATE product SET stock = 200 WHERE article_number = 'ART-003';

-- ART-003: OUT 60 units
WITH mv AS (
    INSERT INTO stock_movement
        (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 60, 'OUT', NULL, 60*3.50,
           '2025-05-08 13:00:00', 'staff', 'seed-out-003-a', 140
    FROM product p WHERE p.article_number = 'ART-003'
    RETURNING id, product_id
),
lot AS (
    SELECT sl.id AS lot_id FROM stock_lot sl
    JOIN product p ON p.id = sl.product_id
    WHERE p.article_number = 'ART-003'
    ORDER BY sl.received_at ASC LIMIT 1
)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 60, 3.50, 210.00 FROM mv, lot;

UPDATE stock_lot SET remaining_quantity = remaining_quantity - 60
WHERE id = (SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id
            WHERE p.article_number='ART-003' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 140 WHERE article_number = 'ART-003';

-- ART-004: IN 500 units @ 1.20
WITH mv AS (
    INSERT INTO stock_movement
        (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 500, 'IN', 1.20, 500*1.20,
           '2025-01-15 09:00:00', 'admin', 'seed-in-004-a', 500
    FROM product p WHERE p.article_number = 'ART-004'
    RETURNING id, product_id
)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 500, 500, 1.20, '2025-01-15 09:00:00', mv.id FROM mv;

UPDATE product SET stock = 500 WHERE article_number = 'ART-004';

-- ART-005: IN 15 units @ 38.00
WITH mv AS (
    INSERT INTO stock_movement
        (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 15, 'IN', 38.00, 15*38.00,
           '2025-03-20 10:30:00', 'warehouse', 'seed-in-005-a', 15
    FROM product p WHERE p.article_number = 'ART-005'
    RETURNING id, product_id
)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 15, 15, 38.00, '2025-03-20 10:30:00', mv.id FROM mv;

UPDATE product SET stock = 15 WHERE article_number = 'ART-005';
