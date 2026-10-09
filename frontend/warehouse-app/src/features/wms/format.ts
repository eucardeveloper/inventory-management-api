import type { Lang } from './i18n.ts';
import { localeOf } from './dates.ts';

// One place for number and currency formats, so every screen prints the same value the same way.
// en -> en-GB (1,234.50), de -> de-DE (1.234,50), tr -> tr-TR (1.234,50); currency is always EUR.

const EM_DASH = '—';

function isNum(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function formatInt(v: number | null | undefined, lang: Lang = 'en'): string {
  if (!isNum(v)) return EM_DASH;
  return new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: 0 }).format(v);
}

export function formatCurrency(v: number | null | undefined, lang: Lang = 'en'): string {
  if (!isNum(v)) return EM_DASH;
  return new Intl.NumberFormat(localeOf(lang), { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

/** "+12" / "−3" with a real minus sign, for movement quantities. */
export function formatSigned(v: number | null | undefined, lang: Lang = 'en'): string {
  if (!isNum(v)) return EM_DASH;
  const abs = formatInt(Math.abs(v), lang);
  return v > 0 ? `+${abs}` : v < 0 ? `−${abs}` : abs;
}

/** Labelled count for page headers, e.g. "22 products". `unit` comes from the dictionary. */
export function formatCount(n: number, unit: string, lang: Lang = 'en'): string {
  return `${formatInt(n, lang)} ${unit}`;
}
