import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDailySeries, isThinSeries, topMoved, type MovementLike } from '../src/features/wms/trend.ts';

const NOW = new Date(2026, 9, 9, 12, 0, 0); // 9 Oct 2026, local
const at = (daysAgo: number, hour = 10) => new Date(2026, 9, 9 - daysAgo, hour, 0, 0).toISOString();
const mv = (daysAgo: number, type: 'IN' | 'OUT', quantity: number, productId = 1, productName = 'Mouse'): MovementLike =>
  ({ movementType: type, quantity, occurredAt: at(daysAgo), productId, productName });

test('series has one point per day, oldest first, ending today', () => {
  const s = buildDailySeries([], NOW, 30);
  assert.equal(s.points.length, 30);
  assert.equal(s.points[29].date.getDate(), 9);
  assert.equal(s.points[0].date.getDate(), 10); // 10 Sept
  assert.equal(s.activeDays, 0);
});

test('movements are summed per day and counted as active days', () => {
  const s = buildDailySeries([mv(0, 'IN', 10), mv(0, 'IN', 5), mv(0, 'OUT', 3), mv(2, 'OUT', 7)], NOW, 30);
  assert.deepEqual([s.points[29].in, s.points[29].out], [15, 3]);
  assert.deepEqual([s.points[27].in, s.points[27].out], [0, 7]);
  assert.equal(s.activeDays, 2);
  assert.equal(s.totalIn, 15);
  assert.equal(s.totalOut, 10);
});

test('movements older than the window are ignored', () => {
  const s = buildDailySeries([mv(40, 'IN', 99)], NOW, 30);
  assert.equal(s.totalIn, 0);
});

test('thin data is recognised', () => {
  assert.equal(isThinSeries(buildDailySeries([mv(0, 'IN', 1), mv(1, 'OUT', 1)], NOW)), true);
  const many = [0, 1, 2, 3, 4, 5].map((d) => mv(d, 'IN', 1));
  assert.equal(isThinSeries(buildDailySeries(many, NOW)), false);
});

test('top moved ranks by units moved and respects the window and limit', () => {
  const list = topMoved([
    mv(1, 'IN', 10, 1, 'Mouse'), mv(2, 'OUT', 5, 1, 'Mouse'),
    mv(1, 'OUT', 40, 2, 'Keyboard'), mv(60, 'IN', 500, 3, 'Old'),
    mv(3, 'IN', 1, 4, 'A'), mv(3, 'IN', 1, 5, 'B'),
  ], NOW, 30, 3);
  assert.deepEqual(list.map((r) => r.name), ['Keyboard', 'Mouse', 'A']);
  assert.equal(list[1].total, 15);
  assert.equal(list[1].in, 10);
  assert.equal(list[1].out, 5);
});
