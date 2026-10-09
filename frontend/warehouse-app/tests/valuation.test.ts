import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fifoCostState, listPriceValue, movementCostState, sumFifo } from '../src/features/wms/valuation.ts';

test('stock with a zero FIFO value means "no cost record", not EUR 0', () => {
  assert.equal(fifoCostState(10, 0), 'none');
  assert.equal(fifoCostState(10, null), 'none');
  assert.equal(fifoCostState(10, 250), 'value');
});

test('an empty shelf legitimately has a zero value', () => {
  assert.equal(fifoCostState(0, 0), 'empty');
});

test('list-price value is stock x price; unknown price stays unknown', () => {
  assert.equal(listPriceValue(4, 12.5), 50);
  assert.equal(listPriceValue(4, null), null);
  assert.equal(listPriceValue(0, 12.5), 0);
});

test('FIFO total excludes products without a cost record and counts them', () => {
  const r = sumFifo([
    { currentStock: 10, fifoValue: 100 },
    { currentStock: 5, fifoValue: 0 },
    { currentStock: 0, fifoValue: 0 },
    { currentStock: 3, fifoValue: 30 },
  ]);
  assert.deepEqual(r, { total: 130, withoutCost: 1 });
});

test('a movement cost of 0 or missing is "no cost record", never a real EUR 0.00', () => {
  assert.equal(movementCostState(0), 'none');
  assert.equal(movementCostState(null), 'none');
  assert.equal(movementCostState(undefined), 'none');
  assert.equal(movementCostState(12.5), 'value');
});
