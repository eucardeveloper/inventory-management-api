import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/features/wms/html.ts';

test('escapeHtml neutralises markup so a product name cannot inject script', () => {
  const evil = '<img src=x onerror="alert(1)">';
  const out = escapeHtml(evil);
  assert.equal(out.includes('<'), false);
  assert.equal(out.includes('>'), false);
  assert.equal(out.includes('"'), false);
  assert.equal(out, '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

test('escapeHtml escapes the ampersand first so entities are not double-decoded', () => {
  assert.equal(escapeHtml('A&B <C>'), 'A&amp;B &lt;C&gt;');
});

test('escapeHtml leaves ordinary text unchanged', () => {
  assert.equal(escapeHtml('Dell Laptop XPS 13'), 'Dell Laptop XPS 13');
});
