-- The stock manager role is called INVENTORY_MANAGER, and the demo account that holds it is "manager".
--
-- Earlier migrations stay untouched on purpose: Flyway verifies their checksums, so editing them would
-- stop an existing database from starting. A new migration moves existing data forward instead.
-- On a database without the old role or demo account every statement below changes zero rows.

UPDATE app_user SET role = 'INVENTORY_MANAGER' WHERE role = 'WAREHOUSE_MANAGER';

-- Demo account "warehouse" becomes "manager". Rows that carry its name are renamed first, and only when
-- the old account exists and the new name is still free, so a real user called "manager" is never touched.
UPDATE stock_movement SET performed_by = 'manager'
 WHERE performed_by = 'warehouse'
   AND EXISTS (SELECT 1 FROM app_user WHERE username = 'warehouse')
   AND NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'manager');

UPDATE audit_log SET username = 'manager'
 WHERE username = 'warehouse'
   AND EXISTS (SELECT 1 FROM app_user WHERE username = 'warehouse')
   AND NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'manager');

UPDATE app_user SET username = 'manager', password = '$2a$10$VZXqKSRfFgG33H7jbGinWOpyYt4NQ0SOWOKt7kgWZlJFFQXzztv0y'
 WHERE username = 'warehouse'
   AND NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'manager');
