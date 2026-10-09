// Pure helpers for the product list: search, filter, sort, paginate and stock status.
// Behaviour (also documented in docs/UX-REVIEW.md):
//  - search: case-insensitive; the query is split on spaces and EVERY word must appear in the
//    product name, product code or supplier name
//  - filters: all | active | inactive | low (active and at or below the reorder threshold, including
//    out of stock) | out (active with no stock)
//  - sort: one column at a time, ascending or descending, numbers compared as numbers, texts with a
//    locale-aware natural comparison ("SKU-2" before "SKU-10")
//  - pagination: fixed page size; the page is clamped when the result set shrinks

export interface FilterableProduct {
  name: string;
  articleNumber: string;
  stock: number;
  reorderLevel?: number | null;
  unitPrice?: number | null;
  active: boolean;
  supplier?: { companyName?: string | null } | null;
}

export type ProductFilter = 'all' | 'active' | 'inactive' | 'low' | 'out';
export type StockStatus = 'out' | 'low' | 'ok';
export type SortKey = 'name' | 'articleNumber' | 'stock' | 'reorderLevel' | 'unitPrice' | 'status';
export type SortDir = 'asc' | 'desc';

export function stockStatus(p: Pick<FilterableProduct, 'stock' | 'reorderLevel'>): StockStatus {
  if (p.stock <= 0) return 'out';
  if (p.reorderLevel != null && p.stock <= p.reorderLevel) return 'low';
  return 'ok';
}

/** Active product that is out of stock or at/below its reorder threshold. */
export function needsAttention(p: FilterableProduct): boolean {
  return p.active && stockStatus(p) !== 'ok';
}

export function matchesSearch(p: FilterableProduct, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = `${p.name} ${p.articleNumber} ${p.supplier?.companyName ?? ''}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function filterProducts<T extends FilterableProduct>(list: T[], opts: { search: string; filter: ProductFilter }): T[] {
  return list.filter((p) => {
    if (!matchesSearch(p, opts.search)) return false;
    switch (opts.filter) {
      case 'active': return p.active;
      case 'inactive': return !p.active;
      case 'low': return needsAttention(p);
      case 'out': return p.active && p.stock <= 0;
      default: return true;
    }
  });
}

const STATUS_RANK: Record<StockStatus, number> = { out: 0, low: 1, ok: 2 };

export function sortProducts<T extends FilterableProduct>(list: T[], key: SortKey, dir: SortDir): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  const text = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  return [...list].sort((a, b) => {
    if (key === 'reorderLevel' || key === 'unitPrice') {
      const x = a[key];
      const y = b[key];
      // missing values always sort last, whatever the direction
      if (x == null && y == null) return text(a.name, b.name);
      if (x == null) return 1;
      if (y == null) return -1;
      return x === y ? text(a.name, b.name) : sign * (x - y);
    }
    let c: number;
    switch (key) {
      case 'articleNumber': c = text(a.articleNumber, b.articleNumber); break;
      case 'stock': c = a.stock - b.stock; break;
      case 'status': c = STATUS_RANK[stockStatus(a)] - STATUS_RANK[stockStatus(b)]; break;
      default: c = text(a.name, b.name);
    }
    return c === 0 ? text(a.name, b.name) : sign * c;
  });
}

export function paginate<T>(list: T[], page: number, size: number): { rows: T[]; page: number; pageCount: number; total: number } {
  const pageCount = Math.max(1, Math.ceil(list.length / size));
  const safe = Math.min(Math.max(0, page), pageCount - 1);
  return { rows: list.slice(safe * size, safe * size + size), page: safe, pageCount, total: list.length };
}
