import { Lang } from '@/features/wms/i18n';

// ─── Constants ───────────────────────────────────────────────────────────────

export const DRAWER_WIDTH = 230;
export const DRAWER_COLLAPSED_WIDTH = 64;
export const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export const formatCurrency = (v?: number | null, lang: Lang = 'en') =>
  v == null
    ? '—'
    : new Intl.NumberFormat(lang === 'de' ? 'de-DE' : lang === 'tr' ? 'tr-TR' : 'en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2,
      }).format(v);
