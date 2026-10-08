import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDayKey, parseApiDate } from '../src/features/wms/dates.ts';

test('an ISO timestamp without offset is read as UTC', () => {
  const d = parseApiDate('2026-03-05T09:30:00');
  assert.ok(d);
  assert.equal(d.toISOString(), '2026-03-05T09:30:00.000Z');
});

test('fractional seconds and explicit zones are respected', () => {
  assert.equal(parseApiDate('2026-03-05T09:30:00.123456')?.toISOString(), '2026-03-05T09:30:00.123Z');
  assert.equal(parseApiDate('2026-03-05T09:30:00Z')?.toISOString(), '2026-03-05T09:30:00.000Z');
  assert.equal(parseApiDate('2026-03-05T11:30:00+02:00')?.toISOString(), '2026-03-05T09:30:00.000Z');
});

test('a date-only value is midnight UTC', () => {
  assert.equal(parseApiDate('2026-03-05')?.toISOString(), '2026-03-05T00:00:00.000Z');
});

test('empty or invalid input gives null', () => {
  assert.equal(parseApiDate(undefined), null);
  assert.equal(parseApiDate(''), null);
  assert.equal(parseApiDate('not a date'), null);
});

test('localDayKey formats the local calendar day', () => {
  assert.equal(localDayKey(new Date(2026, 0, 9, 23, 59)), '2026-01-09');
  assert.equal(localDayKey(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
});
