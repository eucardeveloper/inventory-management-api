/**
 * TanStack Query hooks for the Warehouse Management System.
 *
 * ARCHITECTURE DECISION:
 * All server-state lives here, not scattered across components. This gives us:
 *   • Single source of truth for cache keys (typos cause silent cache misses)
 *   • Query invalidation in one place — mutate a product, the list refreshes everywhere
 *   • Easy to mock in tests — swap the hook, not the fetch call
 *
 * QUERY KEY CONVENTION:
 * Arrays with a namespace string first, then parameters.
 * ['products']           → entire products list
 * ['products', id]       → single product
 * ['movements', filters] → filtered movement ledger
 * Invalidating ['products'] busts all product queries (list + detail).
 *
 * CREDENTIALS:
 * All requests use credentials:'include' so the HttpOnly cookie is sent.
 * No token is stored in JS — the cookie is invisible to JavaScript,
 * which prevents XSS token theft.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

// ─── Types (mirrors backend DTOs) ──────────────────────────────────────────

export interface Product {
  id: number;
  articleNumber: string;
  name: string;
  description?: string;
  unitPrice?: number;
  stock: number;
  reorderLevel?: number;
  active: boolean;
  supplierName?: string;
  supplier?: Supplier | null;
  /** True when stock is at or below the reorder level (computed by the API). */
  lowStock?: boolean;
}

export interface Supplier {
  id: number;
  name?: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  articleNumber: string;
  movementType: 'IN' | 'OUT';
  quantity: number;
  occurredAt: string;
  performedBy: string;
  totalCost?: number | null;
  stockAfter: number;
  reversalOfId?: number;
  reversedById?: number;
  reasonCode?: string;
}

export interface AuditEntry {
  id: number;
  userId: number;
  username: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  ipAddress?: string;
  occurredAt: string;
}

export interface StockReport {
  productId: number;
  productName: string;
  articleNumber: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  reorderLevel?: number;
  isLowStock: boolean;
  /** FIFO value of the units on hand, computed on the server; null for roles that may not see costs. */
  inventoryValue?: number | null;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

// ─── API helper ─────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Error from the API. `message` is already phrased for people; `status` is 0 when the server was unreachable. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ProblemBody {
  title?: string;
  detail?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

/** Turns a problem+json body (the API's single error format) into one readable sentence. */
function describeProblem(status: number, text: string): string {
  let body: ProblemBody | null = null;
  try {
    body = JSON.parse(text) as ProblemBody;
  } catch { /* not JSON */ }
  if (!body) return text.trim() || `Request failed (${status})`;
  const fields = body.fieldErrors ? Object.values(body.fieldErrors).join('; ') : '';
  return fields || body.detail || body.message || body.title || `Request failed (${status})`;
}

/** Message for a snackbar or an inline alert, whatever was thrown. */
export function errorMessage(e: unknown, fallback = 'Something went wrong'): string {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'The server cannot be reached. Check your connection and that the backend is running.');
  }

  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/api/auth/')) {
    // Session expired or token rejected: WmsApp listens for this and returns to the login screen.
    window.dispatchEvent(new Event('wms:unauthorized'));
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, describeProblem(res.status, text));
  }

  // 204 No Content — return undefined cast to T
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Query keys (centralised to avoid typos) ────────────────────────────────

export const QK = {
  products:  ['products'] as const,
  product:   (id: number) => ['products', id] as const,
  suppliers: ['suppliers'] as const,
  movements: (filters?: Record<string, unknown>) => ['movements', filters ?? {}] as const,
  report:    ['report'] as const,
  audit:     (filters?: Record<string, unknown>) => ['audit', filters ?? {}] as const,
} as const;

// ─── Product hooks ───────────────────────────────────────────────────────────

/** All products, including deactivated ones (the products screen has an "inactive" filter). */
export function useProducts(opts?: { enabled?: boolean }) {
  return useQuery<Product[]>({
    queryKey: QK.products,
    queryFn: () => apiFetch<Product[]>('/api/products'),
    enabled: opts?.enabled !== false,
    retry: false,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      apiFetch<Product>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.products });
      qc.invalidateQueries({ queryKey: QK.report });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Product> & { id: number }) =>
      apiFetch<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QK.products });
      qc.invalidateQueries({ queryKey: QK.product(id) });
      qc.invalidateQueries({ queryKey: QK.report });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.products });
      qc.invalidateQueries({ queryKey: QK.report });
    },
  });
}

// ─── Supplier hooks ──────────────────────────────────────────────────────────

export function useSuppliers(opts?: { enabled?: boolean }) {
  return useQuery<Supplier[]>({
    queryKey: QK.suppliers,
    queryFn: () => apiFetch<Supplier[]>('/api/suppliers'),
    enabled: opts?.enabled !== false,
    retry: false,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Supplier>) =>
      apiFetch<Supplier>('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.suppliers }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Supplier> & { id: number }) =>
      apiFetch<Supplier>(`/api/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.suppliers }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/suppliers/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.suppliers }),
  });
}

// ─── Stock movement hooks ────────────────────────────────────────────────────

export interface MovementFilters {
  movementType?: 'IN' | 'OUT';
  productId?: number;
  page?: number;
  size?: number;
  enabled?: boolean;
  [key: string]: unknown;
}

export function useMovements(filters?: MovementFilters) {
  const params = new URLSearchParams();
  if (filters?.productId) params.set('productId', String(filters.productId));
  if (filters?.movementType) params.set('movementType', filters.movementType);
  if (filters?.page != null) params.set('page', String(filters.page));
  params.set('size', String(filters?.size ?? 50));
  params.set('sort', 'occurredAt,desc');

  return useQuery<Page<StockMovement>>({
    queryKey: QK.movements(filters),
    queryFn: () => apiFetch<Page<StockMovement>>(`/api/warehouse/movements?${params}`),
    enabled: filters?.enabled !== false,
    retry: false,
  });
}

export function useRecordMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      productId: number;
      movementType: 'IN' | 'OUT';
      quantity: number;
      unitCost?: number;
      idempotencyKey?: string;
    }) =>
      apiFetch<StockMovement>('/api/warehouse/movements', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: QK.products });
      qc.invalidateQueries({ queryKey: QK.report });
    },
  });
}

export function useReverseMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reasonCode }: { id: number; reasonCode: string }) =>
      apiFetch<StockMovement>(`/api/warehouse/movements/${id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reasonCode }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: QK.products });
      qc.invalidateQueries({ queryKey: QK.report });
    },
  });
}

// ─── Stock report hook ───────────────────────────────────────────────────────

export function useStockReport(opts?: { enabled?: boolean }) {
  return useQuery<StockReport[]>({
    queryKey: QK.report,
    queryFn: () => apiFetch<StockReport[]>('/api/warehouse/report'),
    staleTime: 60 * 1000,
    enabled: opts?.enabled !== false,
    retry: false,
  });
}

// ─── Audit log hook ──────────────────────────────────────────────────────────

export interface AuditFilters {
  userId?: number;
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  enabled?: boolean;
  [key: string]: unknown;
}

export function useAuditLog(filters?: AuditFilters) {
  const params = new URLSearchParams();
  if (filters?.userId)     params.set('userId',     String(filters.userId));
  if (filters?.entityType) params.set('entityType', filters.entityType);
  if (filters?.action)     params.set('action',     filters.action);
  if (filters?.from)       params.set('from',       filters.from.length === 10 ? filters.from + 'T00:00:00Z' : filters.from);
  if (filters?.to)         params.set('to',         filters.to.length === 10   ? filters.to   + 'T23:59:59Z' : filters.to);
  params.set('page', String(filters?.page ?? 0));
  params.set('size', String(filters?.size ?? 25));
  params.set('sort', 'occurredAt,desc');

  return useQuery<Page<AuditEntry>>({
    queryKey: QK.audit(filters),
    queryFn: () => apiFetch<Page<AuditEntry>>(`/api/audit?${params}`),
    staleTime: 0,
    enabled: filters?.enabled !== false,
    retry: false,
  });
}

// ─── User Management types & hooks ──────────────────────────────────────────

export interface UserRecord {
  id: number;
  username: string;
  role: 'ADMIN' | 'WAREHOUSE_MANAGER' | 'STAFF';
}

export const QK_USERS = ['users'] as const;

export function useUsers(opts?: { enabled?: boolean }) {
  return useQuery<UserRecord[]>({
    queryKey: QK_USERS,
    queryFn: () => apiFetch<UserRecord[]>('/api/users'),
    enabled: opts?.enabled !== false,
    retry: false,
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiFetch<UserRecord>(`/api/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_USERS }),
  });
}

/** Any signed-in user changes their own password (current password required). */
export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      apiFetch<void>('/api/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  });
}

/** ADMIN resets another user's password (no current password needed). */
export function useChangeUserPassword() {
  return useMutation({
    mutationFn: ({ id, currentPassword, newPassword }: { id: number; currentPassword: string; newPassword: string }) =>
      apiFetch<void>(`/api/users/${id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_USERS }),
  });
}
