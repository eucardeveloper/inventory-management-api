import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateFormatHint, formatIsoDate, isReversedRange, isValidIsoDate, parseDateInput } from '../src/features/wms/dateInput.ts';

test('ISO input is accepted and normalised', () => {
  assert.equal(parseDateInput('2026-10-09'), '2026-10-09');
  assert.equal(parseDateInput(' 2026-1-9 '), '2026-01-09');
});

test('day-first input with dot, slash or dash is accepted', () => {
  assert.equal(parseDateInput('09.10.2026'), '2026-10-09');
  assert.equal(parseDateInput('9/10/2026'), '2026-10-09');
  assert.equal(parseDateInput('31-12-2026'), '2026-12-31');
});

test('impossible or malformed dates are rejected', () => {
  for (const bad of ['', 'abc', '31.02.2026', '2026-13-01', '00.01.2026', '1.1.26', '2026/10/09', '32.01.2026']) {
    assert.equal(parseDateInput(bad), null, bad);
  }
  assert.equal(parseDateInput('29.02.2024'), '2024-02-29'); // leap year
  assert.equal(parseDateInput('29.02.2025'), null);
});

test('display format follows the language', () => {
  assert.equal(formatIsoDate('2026-10-09', 'de'), '09.10.2026');
  assert.equal(formatIsoDate('2026-10-09', 'tr'), '09.10.2026');
  assert.equal(formatIsoDate('2026-10-09', 'en'), '09/10/2026');
  assert.equal(formatIsoDate('nope', 'en'), '');
  assert.equal(formatIsoDate(undefined, 'de'), '');
});

test('round trip: what is displayed can be parsed back', () => {
  for (const lang of ['en', 'de', 'tr'] as const) {
    assert.equal(parseDateInput(formatIsoDate('2026-03-05', lang)), '2026-03-05');
  }
});

test('hints and range check', () => {
  assert.equal(dateFormatHint('de'), 'TT.MM.JJJJ');
  assert.equal(isValidIsoDate('2026-02-30'), false);
  assert.equal(isReversedRange('2026-10-09', '2026-10-01'), true);
  assert.equal(isReversedRange('2026-10-01', '2026-10-01'), false);
  assert.equal(isReversedRange('2026-10-01', undefined), false);
});
