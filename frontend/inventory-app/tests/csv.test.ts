import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../src/features/inventory/csv.ts';

test('toCsv quotes commas, quotes and line breaks per RFC 4180', () => {
  const out = toCsv([{ name: 'Cable, 2 m "pro"', note: 'a\nb' }]);
  assert.equal(out, 'name,note\r\n"Cable, 2 m ""pro""","a\nb"');
});

test('toCsv neutralises spreadsheet formulas in text cells', () => {
  const out = toCsv([{ a: '=HYPERLINK("http://evil")', b: '+1', c: '-2', d: '@SUM(A1)' }]);
  const line = out.split('\r\n')[1];
  assert.equal(line.includes('=HYPERLINK') && !line.includes("'=HYPERLINK"), false);
  assert.ok(line.includes("'+1") && line.includes("'-2") && line.includes("'@SUM(A1)"));
});

test('toCsv keeps real numbers numeric, including negatives, and blanks null', () => {
  assert.equal(toCsv([{ qty: -5, price: 12.5, none: null }]), 'qty,price,none\r\n-5,12.5,');
});

test('toCsv of nothing is empty and keeps Turkish and German characters', () => {
  assert.equal(toCsv([]), '');
  assert.equal(toCsv([{ ad: 'Çelik Şaft Müller' }]), 'ad\r\nÇelik Şaft Müller');
});
