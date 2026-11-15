import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productExportRows, type ProductExportLabels } from '../src/features/inventory/productExport.ts';
import type { Product } from '../src/hooks/useInventoryQueries.ts';

const L: ProductExportLabels = { articleNumber: 'Code', product: 'Product', supplier: 'Supplier', supplierEmail: 'Email', stock: 'Stock', reorderLevel: 'Reorder', shortfall: 'Missing', unitPrice: 'Price', status: 'Status', outOfStock: 'Out', lowStock: 'Low', ok: 'OK', inactive: 'Inactive' };
const p = (o: Partial<Product>): Product => ({ id: 1, name: 'Bolt', articleNumber: 'B-1', stock: 3, reorderLevel: 10, unitPrice: 2.5, active: true, supplier: { id: 1, companyName: 'Acme', email: 'a@acme.test' }, ...o } as Product);

test('shortfall is the units missing to the reorder level and never negative', () => {
  const [low, fine] = productExportRows([p({}), p({ stock: 50 })], L, true);
  assert.equal(low['Missing'], 7);
  assert.equal(fine['Missing'], 0);
});

test('missing reorder level and supplier leave empty cells, not zeros', () => {
  const [row] = productExportRows([p({ reorderLevel: undefined, supplier: null })], L, true);
  assert.equal(row['Reorder'], '');
  assert.equal(row['Missing'], '');
  assert.equal(row['Supplier'], '');
  assert.equal(row['Email'], '');
});

test('status reflects inactive, out, low and ok; price column only with financial access', () => {
  const rows = productExportRows([p({ active: false }), p({ stock: 0 }), p({}), p({ stock: 99 })], L, false);
  assert.deepEqual(rows.map((r) => r['Status']), ['Inactive', 'Out', 'Low', 'OK']);
  assert.equal('Price' in rows[0], false);
});
