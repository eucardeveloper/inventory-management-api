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
