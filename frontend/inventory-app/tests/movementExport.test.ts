import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movementExportRows, type MovementExportLabels } from '../src/features/inventory/movementExport.ts';
import type { StockMovement } from '../src/hooks/useInventoryQueries.ts';

const L: MovementExportLabels = { date: 'Date', articleNumber: 'Code', product: 'Product', type: 'Type', quantity: 'Qty', cost: 'Cost', stockAfter: 'After', user: 'User', reasonCode: 'Reason', stockIn: 'In', stockOut: 'Out', reversal: 'Reversal', reversed: 'Reversed' };
const base: StockMovement = { id: 1, productId: 1, productName: 'Bolt', articleNumber: 'B-1', movementType: 'OUT', quantity: 4, occurredAt: '2026-11-15T10:00:00Z', performedBy: 'admin', totalCost: 20, stockAfter: 6 };

test('out movements export a negative quantity and in movements a positive one', () => {
  const [out, inn] = movementExportRows([base, { ...base, id: 2, movementType: 'IN' }], L, true);
  assert.equal(out['Qty'], -4);
  assert.equal(inn['Qty'], 4);
});

test('the cost column is absent without financial access', () => {
  const [row] = movementExportRows([base], L, false);
  assert.equal('Cost' in row, false);
  assert.equal(movementExportRows([base], L, true)[0]['Cost'], 20);
});

test('reversal rows and reversed rows are flagged and a missing cost stays empty', () => {
  const [a, b] = movementExportRows([{ ...base, reversalOfId: 9, totalCost: null, reasonCode: 'DAMAGED' }, { ...base, reversedById: 3 }], L, true);
  assert.equal(a['Type'], 'Out (Reversal)');
  assert.equal(a['Cost'], '');
  assert.equal(a['Reason'], 'DAMAGED');
  assert.equal(b['Type'], 'Out (Reversed)');
});

test('a cost of zero is exported blank, like the screen shows it', () => {
  assert.equal(movementExportRows([{ ...base, totalCost: 0 }], L, true)[0]['Cost'], '');
});
