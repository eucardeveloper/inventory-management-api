// ─── Settings model ──────────────────────────────────────────────────────────
//
// The API has no settings endpoint, so workspace and notification preferences are stored in this
// browser only (localStorage). Theme and language are the exception: they already have their own
// keys and are applied by the app shell, so the Appearance tab edits those instead of a copy.
// Nothing here talks to the backend, and nothing here is a security control.

import type { Lang } from './i18n.ts';

export type ThemeChoice = 'light' | 'dark';
export type DigestFrequency = 'daily' | 'weekly';

export interface WorkspaceSettings {
  name: string;
  contactEmail: string;
  timezone: string;
}

export interface NotificationSettings {
  lowStock: boolean;
  digest: boolean;
  digestFrequency: DigestFrequency;
  digestEmail: string;
}

export interface AppearanceSettings {
  theme: ThemeChoice;
  lang: Lang;
}

/** What is written to localStorage. */
export interface StoredSettings {
  workspace: WorkspaceSettings;
  notifications: NotificationSettings;
}

/** What the Settings form edits: the stored part plus the live appearance choices. */
export interface SettingsDraft extends StoredSettings {
  appearance: AppearanceSettings;
}

export const SETTINGS_KEY = 'inv.settings.v1';
export const TIMEZONES = ['Europe/Berlin', 'Europe/Istanbul', 'Europe/London', 'UTC'] as const;
export const NAME_MAX = 60;

export const DEFAULT_STORED: StoredSettings = {
  workspace: { name: 'Inventory', contactEmail: '', timezone: 'Europe/Berlin' },
  notifications: { lowStock: true, digest: false, digestFrequency: 'weekly', digestEmail: '' },
};

/** Minimal storage surface, so tests can pass a plain object instead of window.localStorage. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}
function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** Merge unknown JSON over the defaults; anything malformed falls back to the default value. */
export function normalizeStored(raw: unknown): StoredSettings {
  const d = DEFAULT_STORED;
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const w = (obj.workspace && typeof obj.workspace === 'object' ? obj.workspace : {}) as Record<string, unknown>;
  const n = (obj.notifications && typeof obj.notifications === 'object' ? obj.notifications : {}) as Record<string, unknown>;
  const tz = asString(w.timezone, d.workspace.timezone);
  const freq = n.digestFrequency === 'daily' || n.digestFrequency === 'weekly' ? n.digestFrequency : d.notifications.digestFrequency;
  return {
    workspace: {
      name: asString(w.name, d.workspace.name).slice(0, NAME_MAX),
      contactEmail: asString(w.contactEmail, d.workspace.contactEmail),
      timezone: (TIMEZONES as readonly string[]).includes(tz) ? tz : d.workspace.timezone,
    },
    notifications: {
      lowStock: asBool(n.lowStock, d.notifications.lowStock),
      digest: asBool(n.digest, d.notifications.digest),
      digestFrequency: freq,
      digestEmail: asString(n.digestEmail, d.notifications.digestEmail),
    },
  };
}

export function loadStored(store: KeyValueStore | undefined): StoredSettings {
  if (!store) return normalizeStored(null);
  try {
    const text = store.getItem(SETTINGS_KEY);
    return normalizeStored(text ? JSON.parse(text) : null);
  } catch {
    return normalizeStored(null);
  }
}

/** Throws when the browser refuses to store (private mode, quota), so the form can show an error. */
export function saveStored(store: KeyValueStore | undefined, value: StoredSettings): void {
  if (!store) throw new Error('storage-unavailable');
  store.setItem(SETTINGS_KEY, JSON.stringify(normalizeStored(value)));
}

export function isDirty(a: SettingsDraft, b: SettingsDraft): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

/** Field errors keyed by field path; values are dictionary keys. Empty object means valid. */
export type SettingsErrors = Partial<Record<'name' | 'contactEmail' | 'digestEmail', 'settingsErrNameRequired' | 'settingsErrNameLong' | 'settingsErrEmail' | 'settingsErrDigestEmail'>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateDraft(d: SettingsDraft): SettingsErrors {
  const errors: SettingsErrors = {};
  const name = d.workspace.name.trim();
  if (!name) errors.name = 'settingsErrNameRequired';
  else if (name.length > NAME_MAX) errors.name = 'settingsErrNameLong';
  const contact = d.workspace.contactEmail.trim();
  if (contact && !EMAIL.test(contact)) errors.contactEmail = 'settingsErrEmail';
  if (d.notifications.digest && !EMAIL.test(d.notifications.digestEmail.trim())) errors.digestEmail = 'settingsErrDigestEmail';
  return errors;
}

/** Trim text fields before storing. */
export function cleanDraft(d: SettingsDraft): SettingsDraft {
  return {
    ...d,
    workspace: { ...d.workspace, name: d.workspace.name.trim(), contactEmail: d.workspace.contactEmail.trim() },
    notifications: { ...d.notifications, digestEmail: d.notifications.digestEmail.trim() },
  };
}
