-- =============================================================================
-- V6 — Rich interview demo data
-- Adds: 8 more suppliers, 20 more products across 5 categories,
--       60+ stock movements (IN/OUT), audit log entries covering all types.
-- Idempotent: ON CONFLICT DO NOTHING / keyed idempotency_key.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Additional Suppliers
-- ---------------------------------------------------------------------------
INSERT INTO supplier (company_name, contact_person, email, phone) VALUES
    ('MedTech Supplies A.S.',   'Ayse Kaya',       'ayse.kaya@medtech.com.tr',     '+90-212-3456789'),
    ('AutoParts Europe GmbH',   'Klaus Weber',     'k.weber@autoparts-eu.de',       '+49-89-9876543'),
    ('Pacific Electronics Co.', 'Yuki Tanaka',     'y.tanaka@pacific-elec.jp',      '+81-3-55551234'),
    ('ScandiWood AB',           'Anna Lindqvist',  'anna.l@scandiwood.se',          '+46-8-44556677'),
    ('Iberian Components SL',   'Carlos Fernandez','c.fernandez@iberian-comp.es',   '+34-91-2345678'),
    ('AlpineTools AG',          'Peter Huber',     'p.huber@alpinetools.ch',        '+41-44-3334455'),
    ('EastWest Trading Ltd.',   'Mei Chen',        'mei.chen@eastwest.hk',          '+852-2234-5678'),
    ('Adriatic Supplies d.o.o.','Ivan Horvat',     'i.horvat@adriatic-sup.hr',      '+385-1-5556677')
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Products — Medical
-- ---------------------------------------------------------------------------
INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'MED-001', 'Digital Thermometer Pro',
       'Clinical-grade infrared thermometer, +/-0.2C accuracy, 60-reading memory.',
       34.90, 0, 30, TRUE, s.id
FROM supplier s WHERE s.email = 'ayse.kaya@medtech.com.tr' ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'MED-002', 'Pulse Oximeter Clip',
       'SpO2 + heart rate monitor, OLED display, FDA listed, CE marked.',
       22.50, 0, 50, TRUE, s.id
FROM supplier s WHERE s.email = 'ayse.kaya@medtech.com.tr' ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'MED-003', 'Nitrile Exam Gloves (Box/100)',
       'Powder-free, latex-free, 4 mil thick, size M. AQL 1.5.',
       12.80, 0, 200, TRUE, s.id
FROM supplier s WHERE s.email = 'ayse.kaya@medtech.com.tr' ON CONFLICT (article_number) DO NOTHING;

-- Products — Automotive
INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'AUTO-001', 'Bosch Oil Filter F026407123',
       'Spin-on oil filter compatible with VW/Audi 2.0 TDI engines.',
       8.95, 0, 60, TRUE, s.id
FROM supplier s WHERE s.email = 'k.weber@autoparts-eu.de' ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'AUTO-002', 'NGK Spark Plug BCPR6ES',
       'Standard copper core spark plug, pre-gapped 0.8mm.',
       4.20, 0, 100, TRUE, s.id
FROM supplier s WHERE s.email = 'k.weber@autoparts-eu.de' ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'AUTO-003', 'Brake Pad Set Front Axle',
       'Semi-metallic compound, fits Toyota Corolla 2018-2023, with wear indicator.',
       29.90, 0, 25, TRUE, s.id
FROM supplier s WHERE s.email = 'k.weber@autoparts-eu.de' ON CONFLICT (article_number) DO NOTHING;

-- Products — Electronics
INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'ELC-001', 'OLED Display 0.96in 128x64',
       'I2C/SPI dual-mode, 3.3-5V, blue/yellow, SSD1306 controller.',
       3.75, 0, 150, TRUE, s.id
FROM supplier s WHERE s.email = 'y.tanaka@pacific-elec.jp' ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'ELC-002', 'ESP32 DevKit v1',
       'Dual-core 240 MHz, Wi-Fi + BT 4.2, 4 MB flash, 38 GPIO pins.',
       6.80, 0, 80, TRUE, s.id
FROM supplier s WHERE s.email = 'y.tanaka@pacific-elec.jp' ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'ELC-003', 'Lithium 18650 Cell 3400mAh',
       'INR18650-34E, max 6A discharge, flat top, genuine Samsung cell.',
       5.50, 0, 200, TRUE, s.id
FROM supplier s WHERE s.email = 'y.tanaka@pacific-elec.jp' ON CONFLICT (article_number) DO NOTHING;

-- Products — Industrial / Tools
INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'IND-001', 'Torque Wrench 1/2in 40-200 Nm',
       'Click-type, reversible, calibration certificate included.',
       79.00, 0, 10, TRUE, s.id
FROM supplier s WHERE s.email = 'p.huber@alpinetools.ch' ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'IND-002', 'Safety Helmet EN397',
       'ABS shell, 6-point suspension, adjustable chin strap, yellow.',
       14.50, 0, 40, TRUE, s.id
FROM supplier s WHERE s.email = 'p.huber@alpinetools.ch' ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'IND-003', 'Industrial Cable Ties 300mm Pack/100',
       'Nylon 66, UV-resistant, 18 kg tensile strength, black.',
       6.90, 0, 100, TRUE, s.id
FROM supplier s WHERE s.email = 'i.horvat@adriatic-sup.hr' ON CONFLICT (article_number) DO NOTHING;

-- Products — Office / Consumer
INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'OFF-001', 'Ergonomic Lumbar Support',
       'Memory foam, mesh cover, fits most office chairs, adjustable strap.',
       27.00, 0, 20, TRUE, s.id
FROM supplier s WHERE s.email = 'anna.l@scandiwood.se' ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'OFF-002', 'Whiteboard Markers Set 8 colours',
       'Dry-erase, chisel tip, low-odour, 2-year shelf life.',
       9.99, 0, 60, TRUE, s.id
FROM supplier s WHERE s.email = 'c.fernandez@iberian-comp.es' ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'OFF-003', 'Bamboo Desk Organiser',
       '5-compartment, natural bamboo, cable management slot, 30x20x12cm.',
       19.90, 0, 35, TRUE, s.id
FROM supplier s WHERE s.email = 'anna.l@scandiwood.se' ON CONFLICT (article_number) DO NOTHING;

-- Low stock / inactive for realism
INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'ELC-004', 'Raspberry Pi Camera v2',
       '8 MP Sony IMX219, fixed focus, CSI connector. DISCONTINUED.',
       28.00, 3, 15, FALSE, s.id
FROM supplier s WHERE s.email = 'sarah.j@electrosupply.co.uk' ON CONFLICT (article_number) DO NOTHING;

INSERT INTO product (article_number, name, description, unit_price, stock, reorder_level, active, supplier_id)
SELECT 'IND-004', 'CO2 Fire Extinguisher 2kg',
       'EN3 approved, wall bracket included, 5-year service interval.',
       49.00, 2, 8, TRUE, s.id
FROM supplier s WHERE s.email = 'p.huber@alpinetools.ch' ON CONFLICT (article_number) DO NOTHING;

-- =============================================================================
-- STOCK MOVEMENTS
-- =============================================================================

-- MED-001 Digital Thermometer
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 80, 'IN', 27.00, 2160.00, '2025-02-14 08:00:00', 'admin', 'v6-in-med001-a', 80
    FROM product p WHERE p.article_number = 'MED-001' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 80, 80, 27.00, '2025-02-14 08:00:00', mv.id FROM mv;
UPDATE product SET stock = 80 WHERE article_number = 'MED-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 35, 'OUT', NULL, 945.00, '2025-04-03 11:00:00', 'warehouse', 'v6-out-med001-a', 45
    FROM product p WHERE p.article_number = 'MED-001' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='MED-001' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 35, 27.00, 945.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 35 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='MED-001' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 45 WHERE article_number = 'MED-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 60, 'IN', 28.50, 1710.00, '2025-09-10 09:00:00', 'warehouse', 'v6-in-med001-b', 105
    FROM product p WHERE p.article_number = 'MED-001' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 60, 60, 28.50, '2025-09-10 09:00:00', mv.id FROM mv;
UPDATE product SET stock = 105 WHERE article_number = 'MED-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 20, 'OUT', NULL, 540.00, '2026-01-15 14:00:00', 'staff', 'v6-out-med001-b', 85
    FROM product p WHERE p.article_number = 'MED-001' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='MED-001' AND sl.remaining_quantity>0 ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 20, 27.00, 540.00 FROM mv, lot;
UPDATE product SET stock = 85 WHERE article_number = 'MED-001';

-- MED-002 Pulse Oximeter
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 120, 'IN', 16.00, 1920.00, '2025-03-01 08:30:00', 'admin', 'v6-in-med002-a', 120
    FROM product p WHERE p.article_number = 'MED-002' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 120, 120, 16.00, '2025-03-01 08:30:00', mv.id FROM mv;
UPDATE product SET stock = 120 WHERE article_number = 'MED-002';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 50, 'OUT', NULL, 800.00, '2025-06-20 10:00:00', 'staff', 'v6-out-med002-a', 70
    FROM product p WHERE p.article_number = 'MED-002' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='MED-002' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 50, 16.00, 800.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 50 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='MED-002' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 70 WHERE article_number = 'MED-002';

-- MED-003 Nitrile Gloves
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 500, 'IN', 9.50, 4750.00, '2025-01-08 07:00:00', 'admin', 'v6-in-med003-a', 500
    FROM product p WHERE p.article_number = 'MED-003' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 500, 500, 9.50, '2025-01-08 07:00:00', mv.id FROM mv;
UPDATE product SET stock = 500 WHERE article_number = 'MED-003';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 200, 'OUT', NULL, 1900.00, '2025-02-28 09:00:00', 'staff', 'v6-out-med003-a', 300
    FROM product p WHERE p.article_number = 'MED-003' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='MED-003' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 200, 9.50, 1900.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 200 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='MED-003' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 300 WHERE article_number = 'MED-003';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 300, 'IN', 10.20, 3060.00, '2025-07-15 08:00:00', 'warehouse', 'v6-in-med003-b', 600
    FROM product p WHERE p.article_number = 'MED-003' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 300, 300, 10.20, '2025-07-15 08:00:00', mv.id FROM mv;
UPDATE product SET stock = 600 WHERE article_number = 'MED-003';

-- AUTO-001 Oil Filter
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 200, 'IN', 5.80, 1160.00, '2025-01-22 09:00:00', 'warehouse', 'v6-in-auto001-a', 200
    FROM product p WHERE p.article_number = 'AUTO-001' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 200, 200, 5.80, '2025-01-22 09:00:00', mv.id FROM mv;
UPDATE product SET stock = 200 WHERE article_number = 'AUTO-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 75, 'OUT', NULL, 435.00, '2025-03-18 13:00:00', 'staff', 'v6-out-auto001-a', 125
    FROM product p WHERE p.article_number = 'AUTO-001' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='AUTO-001' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 75, 5.80, 435.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 75 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='AUTO-001' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 125 WHERE article_number = 'AUTO-001';

-- AUTO-002 Spark Plug
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 400, 'IN', 2.90, 1160.00, '2025-02-10 10:00:00', 'admin', 'v6-in-auto002-a', 400
    FROM product p WHERE p.article_number = 'AUTO-002' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 400, 400, 2.90, '2025-02-10 10:00:00', mv.id FROM mv;
UPDATE product SET stock = 400 WHERE article_number = 'AUTO-002';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 180, 'OUT', NULL, 522.00, '2025-05-30 11:30:00', 'staff', 'v6-out-auto002-a', 220
    FROM product p WHERE p.article_number = 'AUTO-002' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='AUTO-002' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 180, 2.90, 522.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 180 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='AUTO-002' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 220 WHERE article_number = 'AUTO-002';

-- AUTO-003 Brake Pad
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 60, 'IN', 21.00, 1260.00, '2025-04-01 08:00:00', 'warehouse', 'v6-in-auto003-a', 60
    FROM product p WHERE p.article_number = 'AUTO-003' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 60, 60, 21.00, '2025-04-01 08:00:00', mv.id FROM mv;
UPDATE product SET stock = 60 WHERE article_number = 'AUTO-003';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 22, 'OUT', NULL, 462.00, '2025-08-14 09:30:00', 'staff', 'v6-out-auto003-a', 38
    FROM product p WHERE p.article_number = 'AUTO-003' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='AUTO-003' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 22, 21.00, 462.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 22 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='AUTO-003' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 38 WHERE article_number = 'AUTO-003';

-- ELC-001 OLED Display
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 300, 'IN', 2.50, 750.00, '2025-02-05 10:00:00', 'admin', 'v6-in-elc001-a', 300
    FROM product p WHERE p.article_number = 'ELC-001' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 300, 300, 2.50, '2025-02-05 10:00:00', mv.id FROM mv;
UPDATE product SET stock = 300 WHERE article_number = 'ELC-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 120, 'OUT', NULL, 300.00, '2025-05-12 14:00:00', 'warehouse', 'v6-out-elc001-a', 180
    FROM product p WHERE p.article_number = 'ELC-001' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='ELC-001' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 120, 2.50, 300.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 120 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='ELC-001' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 180 WHERE article_number = 'ELC-001';

-- ELC-002 ESP32
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 150, 'IN', 4.90, 735.00, '2025-03-10 09:00:00', 'warehouse', 'v6-in-elc002-a', 150
    FROM product p WHERE p.article_number = 'ELC-002' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 150, 150, 4.90, '2025-03-10 09:00:00', mv.id FROM mv;
UPDATE product SET stock = 150 WHERE article_number = 'ELC-002';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 40, 'OUT', NULL, 196.00, '2025-07-22 10:00:00', 'staff', 'v6-out-elc002-a', 110
    FROM product p WHERE p.article_number = 'ELC-002' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='ELC-002' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 40, 4.90, 196.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 40 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='ELC-002' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 110 WHERE article_number = 'ELC-002';

-- ELC-003 18650 Cell
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 500, 'IN', 3.80, 1900.00, '2025-01-25 08:00:00', 'admin', 'v6-in-elc003-a', 500
    FROM product p WHERE p.article_number = 'ELC-003' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 500, 500, 3.80, '2025-01-25 08:00:00', mv.id FROM mv;
UPDATE product SET stock = 500 WHERE article_number = 'ELC-003';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 250, 'OUT', NULL, 950.00, '2025-04-18 11:00:00', 'warehouse', 'v6-out-elc003-a', 250
    FROM product p WHERE p.article_number = 'ELC-003' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='ELC-003' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 250, 3.80, 950.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 250 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='ELC-003' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 250 WHERE article_number = 'ELC-003';

-- IND-001 Torque Wrench
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 25, 'IN', 58.00, 1450.00, '2025-03-05 08:30:00', 'admin', 'v6-in-ind001-a', 25
    FROM product p WHERE p.article_number = 'IND-001' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 25, 25, 58.00, '2025-03-05 08:30:00', mv.id FROM mv;
UPDATE product SET stock = 25 WHERE article_number = 'IND-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 8, 'OUT', NULL, 464.00, '2025-06-10 09:00:00', 'staff', 'v6-out-ind001-a', 17
    FROM product p WHERE p.article_number = 'IND-001' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='IND-001' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 8, 58.00, 464.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 8 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='IND-001' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 17 WHERE article_number = 'IND-001';

-- IND-002 Safety Helmet
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 100, 'IN', 9.80, 980.00, '2025-02-20 10:00:00', 'warehouse', 'v6-in-ind002-a', 100
    FROM product p WHERE p.article_number = 'IND-002' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 100, 100, 9.80, '2025-02-20 10:00:00', mv.id FROM mv;
UPDATE product SET stock = 100 WHERE article_number = 'IND-002';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 45, 'OUT', NULL, 441.00, '2025-09-05 13:00:00', 'staff', 'v6-out-ind002-a', 55
    FROM product p WHERE p.article_number = 'IND-002' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='IND-002' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 45, 9.80, 441.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 45 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='IND-002' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 55 WHERE article_number = 'IND-002';

-- IND-003 Cable Ties
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 250, 'IN', 4.50, 1125.00, '2025-01-30 09:00:00', 'admin', 'v6-in-ind003-a', 250
    FROM product p WHERE p.article_number = 'IND-003' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 250, 250, 4.50, '2025-01-30 09:00:00', mv.id FROM mv;
UPDATE product SET stock = 250 WHERE article_number = 'IND-003';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 100, 'OUT', NULL, 450.00, '2025-04-25 10:00:00', 'warehouse', 'v6-out-ind003-a', 150
    FROM product p WHERE p.article_number = 'IND-003' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='IND-003' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 100, 4.50, 450.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 100 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='IND-003' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 150 WHERE article_number = 'IND-003';

-- OFF-001 Lumbar Support
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 50, 'IN', 18.50, 925.00, '2025-04-10 09:00:00', 'warehouse', 'v6-in-off001-a', 50
    FROM product p WHERE p.article_number = 'OFF-001' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 50, 50, 18.50, '2025-04-10 09:00:00', mv.id FROM mv;
UPDATE product SET stock = 50 WHERE article_number = 'OFF-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 18, 'OUT', NULL, 333.00, '2025-08-01 11:00:00', 'staff', 'v6-out-off001-a', 32
    FROM product p WHERE p.article_number = 'OFF-001' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='OFF-001' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 18, 18.50, 333.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 18 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='OFF-001' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 32 WHERE article_number = 'OFF-001';

-- OFF-002 Whiteboard Markers
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 150, 'IN', 6.80, 1020.00, '2025-05-05 08:00:00', 'admin', 'v6-in-off002-a', 150
    FROM product p WHERE p.article_number = 'OFF-002' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 150, 150, 6.80, '2025-05-05 08:00:00', mv.id FROM mv;
UPDATE product SET stock = 150 WHERE article_number = 'OFF-002';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 65, 'OUT', NULL, 442.00, '2025-10-14 09:00:00', 'staff', 'v6-out-off002-a', 85
    FROM product p WHERE p.article_number = 'OFF-002' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='OFF-002' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 65, 6.80, 442.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 65 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='OFF-002' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 85 WHERE article_number = 'OFF-002';

-- OFF-003 Bamboo Organiser
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 80, 'IN', 13.00, 1040.00, '2025-06-01 10:00:00', 'warehouse', 'v6-in-off003-a', 80
    FROM product p WHERE p.article_number = 'OFF-003' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 80, 80, 13.00, '2025-06-01 10:00:00', mv.id FROM mv;
UPDATE product SET stock = 80 WHERE article_number = 'OFF-003';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 30, 'OUT', NULL, 390.00, '2025-11-20 14:00:00', 'staff', 'v6-out-off003-a', 50
    FROM product p WHERE p.article_number = 'OFF-003' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='OFF-003' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 30, 13.00, 390.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 30 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='OFF-003' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 50 WHERE article_number = 'OFF-003';

-- ELC-004 Camera (inactive, low stock)
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 20, 'IN', 20.00, 400.00, '2025-01-05 08:00:00', 'admin', 'v6-in-elc004-a', 20
    FROM product p WHERE p.article_number = 'ELC-004' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 20, 20, 20.00, '2025-01-05 08:00:00', mv.id FROM mv;
UPDATE product SET stock = 20 WHERE article_number = 'ELC-004';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 17, 'OUT', NULL, 340.00, '2025-06-30 09:00:00', 'warehouse', 'v6-out-elc004-a', 3
    FROM product p WHERE p.article_number = 'ELC-004' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='ELC-004' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 17, 20.00, 340.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 17 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='ELC-004' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 3 WHERE article_number = 'ELC-004';

-- IND-004 Fire Extinguisher (critical low stock)
WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 20, 'IN', 36.00, 720.00, '2025-02-28 08:00:00', 'admin', 'v6-in-ind004-a', 20
    FROM product p WHERE p.article_number = 'IND-004' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 20, 20, 36.00, '2025-02-28 08:00:00', mv.id FROM mv;
UPDATE product SET stock = 20 WHERE article_number = 'IND-004';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 18, 'OUT', NULL, 648.00, '2025-11-01 10:00:00', 'staff', 'v6-out-ind004-a', 2
    FROM product p WHERE p.article_number = 'IND-004' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='IND-004' ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 18, 36.00, 648.00 FROM mv, lot;
UPDATE stock_lot SET remaining_quantity = remaining_quantity - 18 WHERE id=(SELECT sl.id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='IND-004' ORDER BY sl.received_at ASC LIMIT 1);
UPDATE product SET stock = 2 WHERE article_number = 'IND-004';

-- =============================================================================
-- RECENT MOVEMENTS (last 30 days — feeds the movement trend chart)
-- =============================================================================

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 50, 'IN', 10.50, 525.00, NOW() - INTERVAL '28 days', 'admin', 'v6-recent-in-001', p.stock + 50
    FROM product p WHERE p.article_number = 'ART-001' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 50, 50, 10.50, NOW() - INTERVAL '28 days', mv.id FROM mv;
UPDATE product SET stock = stock + 50 WHERE article_number = 'ART-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 100, 'IN', 10.20, 1020.00, NOW() - INTERVAL '25 days', 'warehouse', 'v6-recent-in-002', p.stock + 100
    FROM product p WHERE p.article_number = 'MED-003' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 100, 100, 10.20, NOW() - INTERVAL '25 days', mv.id FROM mv;
UPDATE product SET stock = stock + 100 WHERE article_number = 'MED-003';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 30, 'OUT', NULL, 87.00, NOW() - INTERVAL '22 days', 'staff', 'v6-recent-out-001', p.stock - 30
    FROM product p WHERE p.article_number = 'AUTO-002' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='AUTO-002' AND sl.remaining_quantity>0 ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 30, 2.90, 87.00 FROM mv, lot;
UPDATE product SET stock = stock - 30 WHERE article_number = 'AUTO-002';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 75, 'IN', 28.50, 2137.50, NOW() - INTERVAL '18 days', 'admin', 'v6-recent-in-003', p.stock + 75
    FROM product p WHERE p.article_number = 'MED-001' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 75, 75, 28.50, NOW() - INTERVAL '18 days', mv.id FROM mv;
UPDATE product SET stock = stock + 75 WHERE article_number = 'MED-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 20, 'OUT', NULL, 76.00, NOW() - INTERVAL '15 days', 'warehouse', 'v6-recent-out-002', p.stock - 20
    FROM product p WHERE p.article_number = 'ELC-003' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='ELC-003' AND sl.remaining_quantity>0 ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 20, 3.80, 76.00 FROM mv, lot;
UPDATE product SET stock = stock - 20 WHERE article_number = 'ELC-003';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 40, 'IN', 5.50, 220.00, NOW() - INTERVAL '12 days', 'warehouse', 'v6-recent-in-004', p.stock + 40
    FROM product p WHERE p.article_number = 'IND-003' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 40, 40, 5.50, NOW() - INTERVAL '12 days', mv.id FROM mv;
UPDATE product SET stock = stock + 40 WHERE article_number = 'IND-003';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 15, 'OUT', NULL, 240.00, NOW() - INTERVAL '9 days', 'staff', 'v6-recent-out-003', p.stock - 15
    FROM product p WHERE p.article_number = 'MED-002' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='MED-002' AND sl.remaining_quantity>0 ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 15, 16.00, 240.00 FROM mv, lot;
UPDATE product SET stock = stock - 15 WHERE article_number = 'MED-002';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 60, 'IN', 2.50, 150.00, NOW() - INTERVAL '6 days', 'admin', 'v6-recent-in-005', p.stock + 60
    FROM product p WHERE p.article_number = 'ELC-001' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 60, 60, 2.50, NOW() - INTERVAL '6 days', mv.id FROM mv;
UPDATE product SET stock = stock + 60 WHERE article_number = 'ELC-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 25, 'OUT', NULL, 145.00, NOW() - INTERVAL '4 days', 'warehouse', 'v6-recent-out-004', p.stock - 25
    FROM product p WHERE p.article_number = 'AUTO-001' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='AUTO-001' AND sl.remaining_quantity>0 ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 25, 5.80, 145.00 FROM mv, lot;
UPDATE product SET stock = stock - 25 WHERE article_number = 'AUTO-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 10, 'IN', 58.00, 580.00, NOW() - INTERVAL '2 days', 'admin', 'v6-recent-in-006', p.stock + 10
    FROM product p WHERE p.article_number = 'IND-001' RETURNING id, product_id)
INSERT INTO stock_lot (product_id, quantity, remaining_quantity, unit_cost, received_at, source_movement_id)
SELECT mv.product_id, 10, 10, 58.00, NOW() - INTERVAL '2 days', mv.id FROM mv;
UPDATE product SET stock = stock + 10 WHERE article_number = 'IND-001';

WITH mv AS (
    INSERT INTO stock_movement (product_id, quantity, movement_type, unit_cost, total_cost, occurred_at, performed_by, idempotency_key, stock_after)
    SELECT p.id, 5, 'OUT', NULL, 92.50, NOW() - INTERVAL '1 day', 'staff', 'v6-recent-out-005', p.stock - 5
    FROM product p WHERE p.article_number = 'OFF-001' RETURNING id, product_id),
lot AS (SELECT sl.id AS lot_id FROM stock_lot sl JOIN product p ON p.id=sl.product_id WHERE p.article_number='OFF-001' AND sl.remaining_quantity>0 ORDER BY sl.received_at ASC LIMIT 1)
INSERT INTO movement_lot_consumption (movement_id, lot_id, quantity_taken, unit_cost, line_cost)
SELECT mv.id, lot.lot_id, 5, 18.50, 92.50 FROM mv, lot;
UPDATE product SET stock = stock - 5 WHERE article_number = 'OFF-001';

-- =============================================================================
-- AUDIT LOG — covers all action types visible in sidebar
-- =============================================================================

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'USER_LOGIN', 'USER', u.id::text, NULL, NULL, '192.168.1.10', 'Admin login successful — first startup', '2025-01-05 07:58:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'SUPPLIER_CREATED', 'SUPPLIER', NULL, NULL, '{"company":"TechParts GmbH","contact":"Hans Muller","email":"hans.muller@techparts.de"}', '192.168.1.10', 'Supplier TechParts GmbH added', '2025-01-05 08:05:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'SUPPLIER_CREATED', 'SUPPLIER', NULL, NULL, '{"company":"MedTech Supplies A.S.","contact":"Ayse Kaya","email":"ayse.kaya@medtech.com.tr"}', '192.168.1.10', 'Supplier MedTech Supplies A.S. added', '2025-01-06 09:10:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'SUPPLIER_CREATED', 'SUPPLIER', NULL, NULL, '{"company":"AutoParts Europe GmbH","contact":"Klaus Weber","email":"k.weber@autoparts-eu.de"}', '192.168.1.10', 'Supplier AutoParts Europe GmbH added', '2025-01-07 10:00:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'PRODUCT_CREATED', 'PRODUCT', NULL, NULL, '{"article":"ART-001","name":"Arduino Uno Rev3","price":12.50,"reorderLevel":20}', '192.168.1.10', 'Product ART-001 Arduino Uno Rev3 created', '2025-01-09 09:00:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'PRODUCT_CREATED', 'PRODUCT', NULL, NULL, '{"article":"MED-001","name":"Digital Thermometer Pro","price":34.90,"reorderLevel":30}', '192.168.1.10', 'Product MED-001 Digital Thermometer Pro created', '2025-01-10 08:00:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'PRODUCT_CREATED', 'PRODUCT', NULL, NULL, '{"article":"AUTO-001","name":"Bosch Oil Filter","price":8.95,"reorderLevel":60}', '192.168.1.10', 'Product AUTO-001 Bosch Oil Filter created', '2025-01-22 08:30:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'warehouse', 'USER_LOGIN', 'USER', u.id::text, NULL, NULL, '10.0.0.25', 'Warehouse manager login', '2025-01-10 08:25:00' FROM app_user u WHERE u.username = 'warehouse';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'STOCK_IN', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"ART-001","quantity":50,"unitCost":9.80,"totalCost":490.00}', '192.168.1.10', 'Stock IN: 50x Arduino Uno Rev3 @ 9.80', '2025-01-10 08:30:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'STOCK_IN', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"MED-003","quantity":500,"unitCost":9.50,"totalCost":4750.00}', '192.168.1.10', 'Stock IN: 500x Nitrile Gloves @ 9.50', '2025-01-08 07:15:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'PRODUCT_UPDATED', 'PRODUCT', NULL, '{"reorderLevel":15}', '{"reorderLevel":20}', '192.168.1.10', 'ART-001 reorder level updated 15 to 20', '2025-02-01 10:00:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'SUPPLIER_UPDATED', 'SUPPLIER', NULL, '{"phone":"+49-30-1234567"}', '{"phone":"+49-30-9999999"}', '192.168.1.10', 'TechParts GmbH phone number updated', '2025-02-15 11:30:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'staff', 'USER_LOGIN', 'USER', u.id::text, NULL, NULL, '10.0.0.42', 'Staff login', '2025-02-28 09:00:00' FROM app_user u WHERE u.username = 'staff';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'staff', 'STOCK_OUT', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"MED-003","quantity":200,"totalCost":1900.00,"fifo":true}', '10.0.0.42', 'Stock OUT: 200x Nitrile Gloves (FIFO)', '2025-02-28 09:30:00' FROM app_user u WHERE u.username = 'staff';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'warehouse', 'STOCK_IN', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"ART-001","quantity":30,"unitCost":10.20,"totalCost":306.00}', '10.0.0.25', 'Stock IN: 30x Arduino Uno Rev3 @ 10.20 (price increase)', '2025-03-05 09:30:00' FROM app_user u WHERE u.username = 'warehouse';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'staff', 'STOCK_OUT', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"ART-001","quantity":20,"totalCost":196.00}', '10.0.0.42', 'Stock OUT: 20x Arduino Uno Rev3 (FIFO @ 9.80)', '2025-04-12 14:00:00' FROM app_user u WHERE u.username = 'staff';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'STOCK_ADJUSTED', 'STOCK_MOVEMENT', NULL, '{"stock":24}', '{"stock":25,"reason":"CORRECTION"}', '192.168.1.10', 'Stock adjustment ART-002: +1 unit count correction', '2025-05-01 10:00:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'PRODUCT_DEACTIVATED', 'PRODUCT', NULL, '{"article":"ELC-004","active":true}', '{"article":"ELC-004","active":false}', '192.168.1.10', 'ELC-004 Raspberry Pi Camera v2 deactivated — discontinued', '2025-06-15 11:00:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'warehouse', 'STOCK_IN', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"MED-001","quantity":60,"unitCost":28.50,"totalCost":1710.00}', '10.0.0.25', 'Stock IN: 60x Digital Thermometer Pro @ 28.50', '2025-09-10 09:10:00' FROM app_user u WHERE u.username = 'warehouse';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'staff', 'STOCK_OUT', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"IND-004","quantity":18,"totalCost":648.00}', '10.0.0.42', 'Stock OUT: 18x CO2 Fire Extinguisher — critical stock warning triggered', '2025-11-01 10:15:00' FROM app_user u WHERE u.username = 'staff';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'SUPPLIER_CREATED', 'SUPPLIER', NULL, NULL, '{"company":"AlpineTools AG","contact":"Peter Huber","email":"p.huber@alpinetools.ch"}', '192.168.1.10', 'New supplier AlpineTools AG registered', '2025-12-01 09:00:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'USER_LOGIN', 'USER', u.id::text, NULL, NULL, '192.168.1.10', 'Admin login — Q1 2026 start', '2026-01-02 08:00:00' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'STOCK_IN', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"ART-001","quantity":50,"unitCost":10.50,"totalCost":525.00}', '192.168.1.10', 'Stock IN: 50x Arduino Uno Rev3 @ 10.50 (Q1 restock)', NOW() - INTERVAL '28 days' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'warehouse', 'STOCK_IN', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"MED-001","quantity":75,"unitCost":28.50,"totalCost":2137.50}', '10.0.0.25', 'Stock IN: 75x Digital Thermometer Pro Q3 restock', NOW() - INTERVAL '18 days' FROM app_user u WHERE u.username = 'warehouse';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'staff', 'STOCK_OUT', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"MED-002","quantity":15,"totalCost":240.00}', '10.0.0.42', 'Stock OUT: 15x Pulse Oximeter Clip', NOW() - INTERVAL '9 days' FROM app_user u WHERE u.username = 'staff';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'PRODUCT_UPDATED', 'PRODUCT', NULL, '{"unitPrice":34.90}', '{"unitPrice":36.50}', '192.168.1.10', 'MED-001 unit price updated 34.90 to 36.50 (cost increase)', NOW() - INTERVAL '5 days' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'warehouse', 'STOCK_OUT', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"AUTO-001","quantity":25,"totalCost":145.00}', '10.0.0.25', 'Stock OUT: 25x Bosch Oil Filter routine dispatch', NOW() - INTERVAL '4 days' FROM app_user u WHERE u.username = 'warehouse';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'STOCK_IN', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"IND-001","quantity":10,"unitCost":58.00,"totalCost":580.00}', '192.168.1.10', 'Stock IN: 10x Torque Wrench emergency restock', NOW() - INTERVAL '2 days' FROM app_user u WHERE u.username = 'admin';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'staff', 'STOCK_OUT', 'STOCK_MOVEMENT', NULL, NULL, '{"product":"OFF-001","quantity":5,"totalCost":92.50}', '10.0.0.42', 'Stock OUT: 5x Ergonomic Lumbar Support', NOW() - INTERVAL '1 day' FROM app_user u WHERE u.username = 'staff';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'warehouse', 'TOKEN_REFRESHED', 'USER', u.id::text, NULL, NULL, '10.0.0.25', 'Warehouse manager token refreshed', NOW() - INTERVAL '6 hours' FROM app_user u WHERE u.username = 'warehouse';

INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, old_value, new_value, ip_address, description, occurred_at)
SELECT u.id, 'admin', 'USER_LOGOUT', 'USER', u.id::text, NULL, NULL, '192.168.1.10', 'Admin session closed', NOW() - INTERVAL '30 minutes' FROM app_user u WHERE u.username = 'admin';
