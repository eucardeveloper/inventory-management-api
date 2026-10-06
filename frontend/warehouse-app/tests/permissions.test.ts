import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, normalizeRole } from '../src/features/wms/permissions.ts';

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

test('only ADMIN may manage users, see audit and reverse movements', () => {
  for (const [role, p] of Object.entries(PERMISSIONS)) {
    const isAdmin = role === 'ADMIN';
    assert.equal(p.canManageUsers, isAdmin, role);
    assert.equal(p.canSeeAudit, isAdmin, role);
    assert.equal(p.canReverseMovements, isAdmin, role);
  }
});

test('STAFF is read-only with no financial data', () => {
  const s = PERMISSIONS.STAFF;
  assert.equal(s.canWrite, false);
  assert.equal(s.canSeeFinancials, false);
  assert.equal(s.canSeeMovementCost, false);
});

test('privileges never increase from ADMIN down to STAFF', () => {
  const count = (r: keyof typeof PERMISSIONS) => Object.values(PERMISSIONS[r]).filter(Boolean).length;
  assert.ok(count('ADMIN') > count('WAREHOUSE_MANAGER'));
  assert.ok(count('WAREHOUSE_MANAGER') > count('STAFF'));
});
