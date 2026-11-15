import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayEndIso, dayStartIso, isReversedDayRange } from '../src/features/inventory/movementFilters.ts';

test('a picked day starts at local midnight and ends at the last millisecond', () => {
  assert.equal(new Date(dayStartIso('2026-11-14')!).getTime(), new Date(2026, 10, 14, 0, 0, 0, 0).getTime());
  assert.equal(new Date(dayEndIso('2026-11-14')!).getTime(), new Date(2026, 10, 14, 23, 59, 59, 999).getTime());
});

test('empty or impossible days give no bound instead of a wrong one', () => {
  assert.equal(dayStartIso(''), undefined);
  assert.equal(dayStartIso('2026-02-31'), undefined);
  assert.equal(dayEndIso('14.11.2026'), undefined);
});

test('a range is reversed only when both ends are valid and from is after to', () => {
  assert.equal(isReversedDayRange('2026-11-15', '2026-11-14'), true);
  assert.equal(isReversedDayRange('2026-11-14', '2026-11-14'), false);
  assert.equal(isReversedDayRange('', '2026-11-14'), false);
});
