import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, canOpenPage, normalizeRole } from '../src/features/wms/permissions.ts';

test('normalizeRole strips ROLE_ prefix and is case-insensitive', () => {
  assert.equal(normalizeRole('ROLE_ADMIN'), 'ADMIN');
  assert.equal(normalizeRole('role_warehouse_manager'), 'WAREHOUSE_MANAGER');
  assert.equal(normalizeRole('staff'), 'STAFF');
});

test('normalizeRole falls back to least privilege (STAFF)', () => {
  assert.equal(normalizeRole(undefined), 'STAFF');
  assert.equal(normalizeRole(''), 'STAFF');
  assert.equal(normalizeRole('SUPERUSER'), 'STAFF');
});

test('only ADMIN may manage users, see the audit log and delete suppliers', () => {
  for (const [role, p] of Object.entries(PERMISSIONS)) {
    const isAdmin = role === 'ADMIN';
    assert.equal(p.canManageUsers, isAdmin, role);
    assert.equal(p.canSeeAudit, isAdmin, role);
    assert.equal(p.canDeleteSuppliers, isAdmin, role);
  }
});

test('ADMIN and WAREHOUSE_MANAGER run the warehouse: edit master data, reverse, see costs', () => {
  for (const role of ['ADMIN', 'WAREHOUSE_MANAGER'] as const) {
    const p = PERMISSIONS[role];
    assert.equal(p.canEditProducts, true, role);
    assert.equal(p.canEditSuppliers, true, role);
    assert.equal(p.canReverseMovements, true, role);
    assert.equal(p.canSeeFinancials, true, role);
  }
});

test('STAFF books movements but cannot edit, reverse or see costs', () => {
  const s = PERMISSIONS.STAFF;
  assert.equal(s.canBookMovements, true);
  assert.equal(s.canEditProducts, false);
  assert.equal(s.canEditSuppliers, false);
  assert.equal(s.canReverseMovements, false);
  assert.equal(s.canSeeFinancials, false);
});

test('everybody can book movements (POST /api/warehouse/movements is open to all roles)', () => {
  for (const p of Object.values(PERMISSIONS)) assert.equal(p.canBookMovements, true);
});

test('privileges never increase from ADMIN down to STAFF', () => {
  const count = (r: keyof typeof PERMISSIONS) => Object.values(PERMISSIONS[r]).filter(Boolean).length;
  assert.ok(count('ADMIN') > count('WAREHOUSE_MANAGER'));
  assert.ok(count('WAREHOUSE_MANAGER') > count('STAFF'));
});

test('page access: audit and users are ADMIN only, the rest is open', () => {
  assert.equal(canOpenPage(PERMISSIONS.STAFF, 'suppliers'), true);
  assert.equal(canOpenPage(PERMISSIONS.STAFF, 'report'), true);
  assert.equal(canOpenPage(PERMISSIONS.WAREHOUSE_MANAGER, 'audit'), false);
  assert.equal(canOpenPage(PERMISSIONS.WAREHOUSE_MANAGER, 'users'), false);
  assert.equal(canOpenPage(PERMISSIONS.ADMIN, 'audit'), true);
  assert.equal(canOpenPage(PERMISSIONS.ADMIN, 'users'), true);
});

test('settings page is open to every role, workspace settings are ADMIN only', () => {
  for (const p of Object.values(PERMISSIONS)) assert.equal(canOpenPage(p, 'settings'), true);
  assert.equal(PERMISSIONS.ADMIN.canEditWorkspaceSettings, true);
  assert.equal(PERMISSIONS.WAREHOUSE_MANAGER.canEditWorkspaceSettings, false);
  assert.equal(PERMISSIONS.STAFF.canEditWorkspaceSettings, false);
});
