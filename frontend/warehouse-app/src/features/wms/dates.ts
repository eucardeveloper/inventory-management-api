import type { Lang } from './i18n';

/**
 * The API stores and sends UTC. Movement timestamps are ISO-8601 *without* an offset
 * ("2026-03-05T09:30:00"), which `new Date()` would read as local time, so a missing zone is
 * treated as UTC here. Audit timestamps already carry a "Z" and pass through unchanged.
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  let text = value;
  if (!text.includes('T')) {
    text = `${text}T00:00:00Z`;
  } else if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    text = `${text}Z`;
  }
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function localeOf(lang: Lang): string {
  return lang === 'de' ? 'de-DE' : lang === 'tr' ? 'tr-TR' : 'en-GB';
}

export function formatDateTime(value: string | null | undefined, lang: Lang = 'en'): string {
  const d = parseApiDate(value);
  if (!d) return '—';
  return d.toLocaleString(localeOf(lang), { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(value: string | null | undefined, lang: Lang = 'en'): string {
  const d = parseApiDate(value);
  if (!d) return '—';
  return d.toLocaleDateString(localeOf(lang), { dateStyle: 'medium' });
}

/** yyyy-mm-dd in the browser's own time zone (used to bucket movements into calendar days). */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
