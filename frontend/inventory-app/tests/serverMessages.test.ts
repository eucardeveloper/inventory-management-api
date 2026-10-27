import test from 'node:test';
import assert from 'node:assert/strict';
import { translateServerMessage } from '../src/lib/serverMessages.ts';

test('known messages are translated', () => {
  assert.equal(translateServerMessage('tr', 'Username already exists'), 'Bu kullanıcı adı zaten alınmış');
  assert.equal(translateServerMessage('de', 'Username already exists'), 'Benutzername bereits vergeben');
  assert.equal(translateServerMessage('en', 'Username already exists'), 'Username already exists');
});
test('placeholders carry names and numbers', () => {
  const m = "Insufficient stock for 'Bearing 6204': requested 999, available 20";
  assert.equal(translateServerMessage('tr', m), "Yetersiz stok: 'Bearing 6204' için istenen 999, mevcut 20");
  assert.match(translateServerMessage('de', m), /Bearing 6204.*999.*20/);
});
test('unknown messages pass through unchanged', () => {
  assert.equal(translateServerMessage('tr', 'Something odd'), 'Something odd');
});
test('validation messages in the browser language are mapped to the app language', () => {
  assert.equal(translateServerMessage('en', 'düzgün biçimli bir e-posta adresi değil!'), 'Enter a valid email address');
  assert.equal(translateServerMessage('de', 'must be a well-formed email address'), 'Geben Sie eine gültige E-Mail-Adresse ein');
});
test('the unit cost digit limit is mapped in every language', () => {
  const m = 'Unit cost allows at most 15 digits before and 4 after the decimal point';
  assert.equal(translateServerMessage('en', m), 'Unit cost allows at most 4 decimal places');
  assert.equal(translateServerMessage('tr', m), 'Birim maliyet en fazla 4 ondalık basamak içerebilir');
  assert.equal(translateServerMessage('de', m), 'Die Stückkosten dürfen höchstens 4 Nachkommastellen haben');
});

test('duplicate product code, double reversal and inactive product are translated', () => {
  assert.match(translateServerMessage('tr', 'The request conflicts with existing data (for example a duplicate article number or e-mail).'), /çakışıyor/);
  assert.equal(translateServerMessage('tr', 'Movement 101 has already been reversed by movement 102'), 'Hareket 101 zaten geri alınmış (geri alan hareket: 102)');
  assert.equal(translateServerMessage('tr', 'Movement 102 is itself a reversal and cannot be reversed'), 'Hareket 102 bir iptal kaydıdır, geri alınamaz');
  assert.equal(translateServerMessage('tr', 'One or more fields are invalid'), 'Bir veya daha fazla alan geçersiz');
  assert.match(translateServerMessage('tr', 'Product is inactive; reactivate it before recording stock movements: 7'), /Ürün pasif/);
});
