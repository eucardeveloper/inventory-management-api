import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRANSLATIONS } from '../src/features/wms/i18n.ts';
import { AUDIT_ACTIONS, AUDIT_ENTITIES, auditActionLabel, buildAuditDescription, auditEntityLabel, ipLabel, movementTypeLabel } from '../src/features/wms/labels.ts';

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

for (const lang of langs) {
  const dict = TRANSLATIONS[lang] as Record<string, string>;
  test(`${lang}: every audit action has a sentence template with {user}`, () => {
    for (const a of AUDIT_ACTIONS) assert.ok(dict[`audit_sentence_${a}`]?.includes('{user}'), `audit_sentence_${a}`);
  });
}

test('audit description is built from fields, in the chosen language, with an object reference', () => {
  const en = buildAuditDescription(TRANSLATIONS.en as Record<string, string>, { action: 'PRODUCT_CREATED', username: 'admin', entityType: 'Product', entityId: 12 });
  const de = buildAuditDescription(TRANSLATIONS.de as Record<string, string>, { action: 'PRODUCT_CREATED', username: 'admin', entityType: 'Product', entityId: '12' });
  assert.match(en, /admin/);
  assert.match(en, /Product #12/);
  assert.match(de, /Artikel #12/);
  assert.notEqual(en, de);
  assert.doesNotMatch(en, /\{user\}|\{ref\}/);
});

test('audit description without an object has no empty reference and unknown actions still read well', () => {
  const login = buildAuditDescription(TRANSLATIONS.en as Record<string, string>, { action: 'USER_LOGIN', username: 'staff' });
  assert.doesNotMatch(login, /#|\(\)/);
  const unknown = buildAuditDescription({}, { action: 'SOMETHING_NEW', username: 'x' });
  assert.match(unknown, /Something new/);
});
