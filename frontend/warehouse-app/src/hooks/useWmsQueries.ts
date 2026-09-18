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
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

// ─── API helper ─────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    // Try to parse RFC 7807 Problem+JSON
    const text = await res.text().catch(() => res.statusText);
    let detail = text;
    try {
      const json = JSON.parse(text) as { title?: string; detail?: string; message?: string };
      detail = json.detail ?? json.title ?? json.message ?? text;
    } catch { /* not JSON */ }
    throw new Error(`${res.status}: ${detail}`);
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

export function useProducts(opts?: { enabled?: boolean }) {
  return useQuery<Product[]>({
    queryKey: QK.products,
    queryFn: () => apiFetch<Product[]>('/api/products/active'),
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
