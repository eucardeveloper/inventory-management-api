import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRANSLATIONS } from '../src/features/wms/i18n.ts';

const langs = Object.keys(TRANSLATIONS) as Array<keyof typeof TRANSLATIONS>;
const base = new Set(Object.keys(TRANSLATIONS.en));

test('en, tr and de are all present', () => {
  assert.deepEqual([...langs].sort(), ['de', 'en', 'tr']);
});

for (const lang of langs) {
  test(`${lang} has exactly the same keys as en`, () => {
    const keys = new Set(Object.keys(TRANSLATIONS[lang]));
    const missing = [...base].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !base.has(k));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
  });

  test(`${lang} has no empty translations`, () => {
    const empty = Object.entries(TRANSLATIONS[lang]).filter(([, v]) => typeof v !== 'string' || v.trim() === '').map(([k]) => k);
    assert.deepEqual(empty, []);
  });
}

test('placeholders such as {n} are the same in every language', () => {
  const tokens = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
  const bad: string[] = [];
  for (const [key, en] of Object.entries(TRANSLATIONS.en)) {
    for (const lang of langs) {
      const other = (TRANSLATIONS[lang] as Record<string, string>)[key];
      if (tokens(other) !== tokens(en as string)) bad.push(`${lang}.${key}`);
    }
  }
  assert.deepEqual(bad, []);
});
