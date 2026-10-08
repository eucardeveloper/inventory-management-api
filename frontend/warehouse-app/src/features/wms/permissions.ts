// ─── RBAC ────────────────────────────────────────────────────────────────────
//
// This table mirrors what the API enforces (SecurityConfig + @PreAuthorize); the UI only uses it
// to hide or disable what a role cannot do. The backend stays the authority: a hidden button is
// a convenience, not a security control.
//
//                                  ADMIN   WAREHOUSE_MANAGER   STAFF
//   Read dashboard / products /     yes     yes                 yes
//   suppliers / movements / report
//   Cost, valuation, list prices    yes     yes                 no (masked by the API)
//   Book stock in / out             yes     yes                 yes
//   Reverse a movement              yes     yes                 no
//   Create / edit / deactivate      yes     yes                 no
//   products, create / edit suppliers
//   Delete a supplier               yes     no                  no
//   Audit log, user management      yes     no                  no
//   Change own password             yes     yes                 yes

export type WmsRole = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'STAFF';

export interface Permissions {
  /** POST /api/warehouse/movements */
  canBookMovements: boolean;
  /** POST /api/warehouse/movements/{id}/reverse */
  canReverseMovements: boolean;
  /** Create, edit and deactivate products. */
  canEditProducts: boolean;
  /** Create and edit suppliers. */
  canEditSuppliers: boolean;
  /** DELETE /api/suppliers/{id} is ADMIN only. */
  canDeleteSuppliers: boolean;
  /** Costs, stock value and list prices (the API masks them for STAFF). */
  canSeeFinancials: boolean;
  /** GET /api/audit */
  canSeeAudit: boolean;
  /** /api/users: list, change role, reset password, delete. */
  canManageUsers: boolean;
}

export const PERMISSIONS: Record<WmsRole, Permissions> = {
  ADMIN: {
    canBookMovements: true,
    canReverseMovements: true,
    canEditProducts: true,
    canEditSuppliers: true,
    canDeleteSuppliers: true,
    canSeeFinancials: true,
    canSeeAudit: true,
    canManageUsers: true,
  },
  WAREHOUSE_MANAGER: {
    canBookMovements: true,
    canReverseMovements: true,
    canEditProducts: true,
    canEditSuppliers: true,
    canDeleteSuppliers: false,
    canSeeFinancials: true,
    canSeeAudit: false,
    canManageUsers: false,
  },
  STAFF: {
    canBookMovements: true,
    canReverseMovements: false,
    canEditProducts: false,
    canEditSuppliers: false,
    canDeleteSuppliers: false,
    canSeeFinancials: false,
    canSeeAudit: false,
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

/** Pages a role may open (the API still decides what each page can load). */
export type PageId = 'dashboard' | 'products' | 'suppliers' | 'movements' | 'report' | 'audit' | 'users';

export function canOpenPage(perms: Permissions, page: PageId): boolean {
  if (page === 'audit') return perms.canSeeAudit;
  if (page === 'users') return perms.canManageUsers;
  return true;
}
