import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRANSLATIONS } from '../src/features/wms/i18n.ts';
import { AUDIT_ACTIONS, AUDIT_ENTITIES, auditActionLabel, auditEntityLabel, ipLabel, movementTypeLabel } from '../src/features/wms/labels.ts';

const langs = ['en', 'tr', 'de'] as const;

for (const lang of langs) {
  const dict = TRANSLATIONS[lang] as Record<string, string>;

  test(`${lang}: every audit action and entity has a dictionary label`, () => {
    for (const a of AUDIT_ACTIONS) assert.ok(dict[`audit_${a}`], `audit_${a}`);
    for (const e of AUDIT_ENTITIES) assert.ok(dict[`entity_${e}`], `entity_${e}`);
  });

  test(`${lang}: labels never fall back to the raw code`, () => {
    for (const a of AUDIT_ACTIONS) assert.notEqual(auditActionLabel(dict, a), a);
    assert.equal(movementTypeLabel(dict, 'IN'), dict.stockIn);
    assert.equal(movementTypeLabel(dict, 'OUT'), dict.stockOut);
  });
}

test('unknown audit actions fall back to a readable sentence', () => {
  assert.equal(auditActionLabel({}, 'SOMETHING_NEW_HAPPENED'), 'Something new happened');
  assert.equal(auditEntityLabel({}, undefined), '—');
  assert.equal(auditEntityLabel({}, 'Widget'), 'Widget');
});

test('internal calls are labelled, real addresses are shown as they are', () => {
  assert.equal(ipLabel({ ipInternal: 'internal call' }, 'internal'), 'internal call');
  assert.equal(ipLabel({ ipInternal: 'x' }, '10.0.0.7'), '10.0.0.7');
  assert.equal(ipLabel({}, null), '—');
});

test('the movement-type words differ between languages (no leftover English)', () => {
  assert.notEqual(TRANSLATIONS.de.stockIn, TRANSLATIONS.en.stockIn);
  assert.notEqual(TRANSLATIONS.tr.stockOut, TRANSLATIONS.en.stockOut);
});
