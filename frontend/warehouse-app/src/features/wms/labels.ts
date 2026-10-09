// Dictionary-backed labels for values that come from the API as codes (audit actions, entity types,
// movement types). The codes themselves are never shown translated in data columns that carry
// technical identifiers; only these human-facing labels are.

export const AUDIT_ACTIONS = [
  'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTER', 'TOKEN_REFRESHED',
  'USER_ROLE_CHANGED', 'USER_PASSWORD_CHANGED', 'USER_DELETED',
  'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DEACTIVATED',
  'SUPPLIER_CREATED', 'SUPPLIER_UPDATED', 'SUPPLIER_DELETED',
  'STOCK_IN', 'STOCK_OUT', 'STOCK_ADJUSTED',
] as const;

export const AUDIT_ENTITIES = ['User', 'Product', 'Supplier', 'Stock'] as const;

type Dict = Record<string, string>;

function humanize(code: string): string {
  const s = code.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function auditActionLabel(dict: Dict, action: string): string {
  return dict[`audit_${action}`] ?? humanize(action);
}

export function auditEntityLabel(dict: Dict, entity: string | null | undefined): string {
  if (!entity) return '—';
  return dict[`entity_${entity}`] ?? entity;
}

/** The API reports internal service calls as the literal "internal"; show that in the user's language. */
export function ipLabel(dict: Dict, ip: string | null | undefined): string {
  if (!ip) return '—';
  return ip === 'internal' ? dict.ipInternal ?? ip : ip;
}

export function movementTypeLabel(dict: Dict, type: 'IN' | 'OUT'): string {
  return type === 'IN' ? dict.stockIn : dict.stockOut;
}
