import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelIndices, niceScale } from '../src/features/wms/chartScale.ts';

test('nice scale rounds the maximum up to a round tick', () => {
  assert.deepEqual(niceScale(37), { max: 40, step: 10, ticks: [0, 10, 20, 30, 40] });
  assert.deepEqual(niceScale(100), { max: 100, step: 25, ticks: [0, 25, 50, 75, 100] });
  assert.deepEqual(niceScale(7).ticks, [0, 2, 4, 6, 8]);
});

test('empty or invalid data still gives a usable axis', () => {
  for (const v of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const s = niceScale(v);
    assert.equal(s.ticks[0], 0);
    assert.ok(s.max > 0);
  }
});

test('ticks start at zero, are evenly spaced and cover the maximum', () => {
  for (const v of [1, 3, 9, 12, 48, 133, 999, 1234, 56789]) {
    const s = niceScale(v);
    assert.equal(s.ticks[0], 0);
    assert.ok(s.max >= v, `max covers ${v}`);
    assert.ok(s.ticks.length <= 8, `few ticks for ${v}`);
    for (let i = 1; i < s.ticks.length; i += 1) assert.ok(Math.abs(s.ticks[i] - s.ticks[i - 1] - s.step) < 1e-9);
  }
});

test('x labels never overlap: at most one per minimum width', () => {
  assert.deepEqual(labelIndices(30, 560, 56).length <= 10, true);
  assert.deepEqual(labelIndices(30, 100000, 56).length, 30);
  assert.deepEqual(labelIndices(0, 500), []);
  assert.equal(labelIndices(30, 10)[0], 0);
});
