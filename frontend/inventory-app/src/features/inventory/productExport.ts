import type { Product } from '../../hooks/useInventoryQueries.ts';
import { stockStatus } from './productFilters.ts';

export interface ProductExportLabels {
  articleNumber: string; product: string; supplier: string; supplierEmail: string; stock: string;
  reorderLevel: string; shortfall: string; unitPrice: string; status: string;
  outOfStock: string; lowStock: string; ok: string; inactive: string;
}

/**
 * One flat row per product in the order shown on screen. "Missing to threshold" is how many units
 * are needed to get back to the reorder level, so filtering to low stock and one supplier gives a
 * ready reorder list. The price column is left out for roles without financial access.
 */
export function productExportRows(products: Product[], l: ProductExportLabels, showPrice: boolean): Record<string, unknown>[] {
  return products.map((p) => {
    const st = stockStatus(p);
    const row: Record<string, unknown> = {
      [l.articleNumber]: p.articleNumber,
      [l.product]: p.name,
      [l.supplier]: p.supplier?.companyName ?? '',
      [l.supplierEmail]: p.supplier?.email ?? '',
      [l.stock]: p.stock,
      [l.reorderLevel]: p.reorderLevel ?? '',
      [l.shortfall]: p.reorderLevel != null ? Math.max(0, p.reorderLevel - p.stock) : '',
    };
    if (showPrice) row[l.unitPrice] = p.unitPrice ?? '';
    row[l.status] = !p.active ? l.inactive : st === 'out' ? l.outOfStock : st === 'low' ? l.lowStock : l.ok;
    return row;
  });
}
