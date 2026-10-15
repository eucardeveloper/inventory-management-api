import type { Lang } from './i18n.ts';

// Date entry that does not depend on the browser's locale. The audit filter shows a text field in the
// interface language's day-first format (de/tr 31.12.2026, en 31/12/2026) and also accepts ISO 2026-12-31.
// Everything stored or sent to the API is ISO yyyy-mm-dd.

export function isValidIsoDate(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Parses user text to ISO yyyy-mm-dd, or null when it is not a real calendar date. Empty text is null too. */
export function parseDateInput(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) {
    const [y, m, d] = t.split('-');
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return isValidIsoDate(iso) ? iso : null;
  }
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(t);
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return isValidIsoDate(iso) ? iso : null;
}

export function formatIsoDate(iso: string | null | undefined, lang: Lang = 'en'): string {
  if (!iso || !isValidIsoDate(iso)) return '';
  const [y, m, d] = iso.split('-');
  return lang === 'en' ? `${d}/${m}/${y}` : `${d}.${m}.${y}`;
}

/** Format hint shown as placeholder / helper text. */
export function dateFormatHint(lang: Lang): string {
  return lang === 'de' ? 'TT.MM.JJJJ' : lang === 'tr' ? 'GG.AA.YYYY' : 'DD/MM/YYYY';
}

/** True when both dates are present and `from` is after `to`. */
export function isReversedRange(from: string | null | undefined, to: string | null | undefined): boolean {
  return !!from && !!to && from > to;
}
