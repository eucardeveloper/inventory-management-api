INSERT INTO app_user (id, username, password, role) VALUES
(1, 'admin', '/PgBkqquzi.Hy1NUYZCrVi2qQUm', 'ADMIN'),
(2, 'manager', '/PgBkqquzi.Hy1NUYZCrVi2qQUm', 'MANAGER'),
(3, 'warehouse', '/PgBkqquzi.Hy1NUYZCrVi2qQUm', 'WAREHOUSE_MANAGER'),
(4, 'staff', '/PgBkqquzi.Hy1NUYZCrVi2qQUm', 'STAFF');

INSERT INTO supplier (id, company_name, contact_person, email, phone) VALUES
(1, 'Acme Electronics', 'John Smith', 'john@acme.com', '+1-555-0001'),
(2, 'Global Logistics', 'Maria Garcia', 'maria@global.com', '+1-555-0002'),
(3, 'TechParts Co', 'Ahmed Hassan', 'ahmed@techparts.com', '+1-555-0003');

INSERT INTO product (id, name, article_number, description, unit_price, stock, reorder_level, active, supplier_id) VALUES
(1, 'Dell Laptop XPS 13', 'SKU-LPT-001', 'Premium laptop', 1299.99, 15, 3, true, 1),
(2, 'Logitech MX Master', 'SKU-MSE-001', 'Wireless mouse', 99.99, 45, 5, true, 1),
(3, 'Mechanical Keyboard RGB', 'SKU-KBD-001', 'Gaming keyboard', 149.99, 20, 4, true, 2),
(4, 'USB-C Hub 7-in-1', 'SKU-HUB-001', 'Multi-port hub', 49.99, 30, 5, true, 1),
(5, '4K Monitor 27in', 'SKU-MON-001', '4K display', 399.99, 8, 2, true, 3),
(6, 'Wireless Headphones', 'SKU-HDH-001', 'Bluetooth headphones', 199.99, 25, 3, true, 2);

INSERT INTO stock_movement (id, product_id, movement_type, quantity, occurred_at, performed_by, total_cost, stock_after) VALUES
(1, 1, 'IN', 15, NOW() - INTERVAL '30 days', 'admin', 13500.00, 15),
(2, 2, 'IN', 45, NOW() - INTERVAL '20 days', 'admin', 2700.00, 45),
(3, 3, 'IN', 20, NOW() - INTERVAL '15 days', 'warehouse', 2000.00, 20),
(4, 4, 'IN', 30, NOW() - INTERVAL '10 days', 'admin', 1050.00, 30),
(5, 5, 'IN', 8, NOW() - INTERVAL '5 days', 'warehouse', 2000.00, 8),
(6, 6, 'IN', 25, NOW() - INTERVAL '8 days', 'admin', 3000.00, 25),
(7, 2, 'OUT', 3, NOW() - INTERVAL '3 days', 'staff', 299.97, 42),
(8, 3, 'OUT', 5, NOW() - INTERVAL '2 days', 'staff', 749.95, 15),
(9, 1, 'OUT', 2, NOW() - INTERVAL '1 day', 'staff', 2599.98, 13);
