

// ─── RBAC ────────────────────────────────────────────────────────────────────

export type WmsRole = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'STAFF';

export interface Permissions {
  canWrite: boolean;
  canSeeAudit: boolean;
  canSeeFinancials: boolean;
  canReverseMovements: boolean;
  canManageSuppliers: boolean;
  canSeeProductEdit: boolean;
  canSeeSupplierSection: boolean;
  canSeeReportSection: boolean;
  canSeeMovementCost: boolean;
  canManageUsers: boolean;
}

export const PERMISSIONS: Record<WmsRole, Permissions> = {
  ADMIN: {
    canWrite: true,
    canSeeAudit: true,
    canSeeFinancials: true,
    canReverseMovements: true,
    canManageSuppliers: true,
    canSeeProductEdit: true,
    canSeeSupplierSection: true,
    canSeeReportSection: true,
    canSeeMovementCost: true,
    canManageUsers: true,
  },
  WAREHOUSE_MANAGER: {
    canWrite: true,
    canSeeAudit: false,
    canSeeFinancials: true,
    canReverseMovements: false,
    canManageSuppliers: false,
    canSeeProductEdit: false,
    canSeeSupplierSection: true,
    canSeeReportSection: true,
    canSeeMovementCost: true,
    canManageUsers: false,
  },
  STAFF: {
    canWrite: false,
    canSeeAudit: false,
    canSeeFinancials: false,
    canReverseMovements: false,
    canManageSuppliers: false,
    canSeeProductEdit: false,
    canSeeSupplierSection: false,
    canSeeReportSection: false,
    canSeeMovementCost: false,
    canManageUsers: false,
  },
};

export function normalizeRole(raw: string | undefined): WmsRole {
  const r = (raw ?? '').replace(/^ROLE_/i, '').toUpperCase();
  if (r === 'ADMIN') return 'ADMIN';
  if (r === 'WAREHOUSE_MANAGER') return 'WAREHOUSE_MANAGER';
  if (r === 'STAFF') return 'STAFF';
  return 'STAFF';
}
