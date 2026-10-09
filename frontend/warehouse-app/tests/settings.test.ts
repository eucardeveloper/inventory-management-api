import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STORED, SETTINGS_KEY, cleanDraft, isDirty, loadStored, normalizeStored, saveStored, validateDraft,
  type KeyValueStore, type SettingsDraft,
} from '../src/features/wms/settings.ts';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

const draft = (): SettingsDraft => ({ ...structuredClone(DEFAULT_STORED), appearance: { theme: 'light', lang: 'en' } });

test('defaults when nothing is stored, no storage, or the JSON is broken', () => {
  assert.deepEqual(loadStored(memoryStore()), DEFAULT_STORED);
  assert.deepEqual(loadStored(undefined), DEFAULT_STORED);
  assert.deepEqual(loadStored(memoryStore({ [SETTINGS_KEY]: '{not json' })), DEFAULT_STORED);
});

test('a saved value is read back', () => {
  const store = memoryStore();
  const stored = structuredClone(DEFAULT_STORED);
  stored.workspace.name = 'Hamburg depot';
  stored.notifications.digest = true;
  stored.notifications.digestEmail = 'ops@example.com';
  saveStored(store, stored);
  assert.deepEqual(loadStored(store), stored);
});

test('wrong types and unknown values fall back field by field', () => {
  const s = normalizeStored({ workspace: { name: 5, timezone: 'Mars/Base' }, notifications: { lowStock: 'yes', digestFrequency: 'hourly' } });
  assert.equal(s.workspace.name, DEFAULT_STORED.workspace.name);
  assert.equal(s.workspace.timezone, DEFAULT_STORED.workspace.timezone);
  assert.equal(s.notifications.lowStock, DEFAULT_STORED.notifications.lowStock);
  assert.equal(s.notifications.digestFrequency, DEFAULT_STORED.notifications.digestFrequency);
});

test('saving without storage, or when the browser refuses, throws so the form can show an error', () => {
  assert.throws(() => saveStored(undefined, DEFAULT_STORED));
  const blocked: KeyValueStore = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.throws(() => saveStored(blocked, DEFAULT_STORED));
});

test('validation: name required and limited, emails checked', () => {
  const d = draft();
  assert.deepEqual(validateDraft(d), {});
  d.workspace.name = '   ';
  assert.equal(validateDraft(d).name, 'settingsErrNameRequired');
  d.workspace.name = 'x'.repeat(61);
  assert.equal(validateDraft(d).name, 'settingsErrNameLong');
  d.workspace.name = 'ok';
  d.workspace.contactEmail = 'nope';
  assert.equal(validateDraft(d).contactEmail, 'settingsErrEmail');
  d.workspace.contactEmail = 'a@b.de';
  assert.deepEqual(validateDraft(d), {});
});

test('digest email is required only when the digest is on', () => {
  const d = draft();
  d.notifications.digest = true;
  assert.equal(validateDraft(d).digestEmail, 'settingsErrDigestEmail');
  d.notifications.digestEmail = 'ops@example.com';
  assert.deepEqual(validateDraft(d), {});
});

test('isDirty detects a change and ignores an identical copy', () => {
  const a = draft();
  assert.equal(isDirty(a, structuredClone(a)), false);
  const b = structuredClone(a);
  b.appearance.theme = 'dark';
  assert.equal(isDirty(a, b), true);
});

test('cleanDraft trims text fields', () => {
  const d = draft();
  d.workspace.name = '  Depot  ';
  d.workspace.contactEmail = ' a@b.de ';
  const c = cleanDraft(d);
  assert.equal(c.workspace.name, 'Depot');
  assert.equal(c.workspace.contactEmail, 'a@b.de');
});
