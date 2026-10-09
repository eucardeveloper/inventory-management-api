import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterProducts, matchesSearch, needsAttention, paginate, sortProducts, stockStatus, type FilterableProduct } from '../src/features/wms/productFilters.ts';

const p = (over: Partial<FilterableProduct>): FilterableProduct => ({
  name: 'Item', articleNumber: 'SKU-001', stock: 10, reorderLevel: 5, unitPrice: 10, active: true, supplier: { companyName: 'Acme' }, ...over,
});

const list: FilterableProduct[] = [
  p({ name: 'Dell Laptop', articleNumber: 'SKU-LPT-001', stock: 15, reorderLevel: 3, unitPrice: 1299.99 }),
  p({ name: 'Mouse', articleNumber: 'SKU-MSE-010', stock: 2, reorderLevel: 5, unitPrice: 99.99, supplier: { companyName: 'Global Logistics' } }),
  p({ name: 'Keyboard', articleNumber: 'SKU-KBD-002', stock: 0, reorderLevel: 4, unitPrice: null }),
  p({ name: 'Old Hub', articleNumber: 'SKU-HUB-001', stock: 0, reorderLevel: 4, active: false }),
  p({ name: 'Cable', articleNumber: 'SKU-CBL-100', stock: 7, reorderLevel: null, unitPrice: 4 }),
];

test('stock status: out at zero, low at or below threshold, otherwise ok', () => {
  assert.equal(stockStatus({ stock: 0, reorderLevel: 4 }), 'out');
  assert.equal(stockStatus({ stock: 0, reorderLevel: null }), 'out');
  assert.equal(stockStatus({ stock: 5, reorderLevel: 5 }), 'low');
  assert.equal(stockStatus({ stock: 6, reorderLevel: 5 }), 'ok');
  assert.equal(stockStatus({ stock: 3, reorderLevel: null }), 'ok');
});

test('inactive products never need attention', () => {
  assert.equal(needsAttention(list[3]), false);
  assert.equal(needsAttention(list[1]), true);
});

test('search is case-insensitive and matches name, code and supplier', () => {
  assert.equal(matchesSearch(list[0], 'laptop'), true);
  assert.equal(matchesSearch(list[0], 'lpt-001'), true);
  assert.equal(matchesSearch(list[1], 'GLOBAL'), true);
  assert.equal(matchesSearch(list[0], 'zzz'), false);
});

test('every word of the query must match (AND), in any order', () => {
  assert.equal(matchesSearch(list[0], 'dell 001'), true);
  assert.equal(matchesSearch(list[0], '001 dell'), true);
  assert.equal(matchesSearch(list[0], 'dell mouse'), false);
  assert.equal(matchesSearch(list[0], '   '), true);
});

test('filters', () => {
  const names = (f: Parameters<typeof filterProducts>[1]['filter']) => filterProducts(list, { search: '', filter: f }).map((x) => x.name);
  assert.deepEqual(names('all'), ['Dell Laptop', 'Mouse', 'Keyboard', 'Old Hub', 'Cable']);
  assert.deepEqual(names('active'), ['Dell Laptop', 'Mouse', 'Keyboard', 'Cable']);
  assert.deepEqual(names('inactive'), ['Old Hub']);
  assert.deepEqual(names('low'), ['Mouse', 'Keyboard']);
  assert.deepEqual(names('out'), ['Keyboard']);
});

test('search and filter combine', () => {
  const r = filterProducts(list, { search: 'sku-hub', filter: 'active' });
  assert.deepEqual(r, []);
});

test('sort by name uses natural order and does not mutate the input', () => {
  const before = list.map((x) => x.name);
  const sorted = sortProducts(list, 'name', 'asc').map((x) => x.name);
  assert.deepEqual(sorted, ['Cable', 'Dell Laptop', 'Keyboard', 'Mouse', 'Old Hub']);
  assert.deepEqual(list.map((x) => x.name), before);
});

test('sort by code is natural ("SKU-2" before "SKU-10")', () => {
  const l = [p({ name: 'b', articleNumber: 'SKU-10' }), p({ name: 'a', articleNumber: 'SKU-2' })];
  assert.deepEqual(sortProducts(l, 'articleNumber', 'asc').map((x) => x.articleNumber), ['SKU-2', 'SKU-10']);
});

test('sort by number, descending; missing values always last', () => {
  assert.deepEqual(sortProducts(list, 'stock', 'desc').map((x) => x.stock), [15, 7, 2, 0, 0]);
  assert.equal(sortProducts(list, 'unitPrice', 'asc').at(-1)?.name, 'Keyboard');
  const desc = sortProducts(list, 'unitPrice', 'desc').map((x) => x.unitPrice);
  assert.equal(desc[0], 1299.99);
  assert.equal(desc[desc.length - 1], null);
});

test('sort by status puts out of stock first', () => {
  assert.deepEqual(sortProducts(list, 'status', 'asc').map((x) => stockStatus(x)), ['out', 'out', 'low', 'ok', 'ok']);
});

test('pagination clamps the page and reports totals', () => {
  const many = Array.from({ length: 53 }, (_, i) => i);
  assert.deepEqual(paginate(many, 0, 25).rows.length, 25);
  assert.equal(paginate(many, 2, 25).rows.length, 3);
  assert.equal(paginate(many, 9, 25).page, 2);
  assert.equal(paginate(many, -4, 25).page, 0);
  assert.equal(paginate([], 3, 25).pageCount, 1);
  assert.equal(paginate(many, 0, 25).pageCount, 3);
});
