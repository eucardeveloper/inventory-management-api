import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCount, formatCurrency, formatInt, formatSigned } from '../src/features/wms/format.ts';

// Intl output uses non-breaking spaces in some locales; normalise before comparing.
const plain = (s: string) => s.replace(/[  ]/g, ' ');

test('integers use the language grouping', () => {
  assert.equal(formatInt(1234567, 'en'), '1,234,567');
  assert.equal(formatInt(1234567, 'de'), '1.234.567');
  assert.equal(formatInt(1234567, 'tr'), '1.234.567');
});

test('currency is EUR with two decimals in every language', () => {
  assert.equal(plain(formatCurrency(153799, 'en')), '€153,799.00');
  assert.equal(plain(formatCurrency(153799, 'de')), '153.799,00 €');
  assert.match(plain(formatCurrency(1234.5, 'tr')), /1\.234,50/);
  assert.ok(formatCurrency(1234.5, 'tr').includes('€'));
});

test('missing or invalid numbers print an em dash, never 0 or NaN', () => {
  for (const v of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(formatInt(v, 'en'), '—');
    assert.equal(formatCurrency(v, 'de'), '—');
    assert.equal(formatSigned(v, 'tr'), '—');
  }
});

test('signed quantities use a real minus sign', () => {
  assert.equal(formatSigned(5, 'en'), '+5');
  assert.equal(formatSigned(-5, 'en'), '−5');
  assert.equal(formatSigned(0, 'en'), '0');
  assert.equal(formatSigned(-1500, 'de'), '−1.500');
});

test('labelled counts put the unit after the number', () => {
  assert.equal(formatCount(22, 'products', 'en'), '22 products');
  assert.equal(formatCount(1200, 'Artikel', 'de'), '1.200 Artikel');
});
