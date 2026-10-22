import type { Lang } from '@/features/inventory/i18n';

/**
 * The backend answers in English. The UI is trilingual, so known validation and business-rule
 * messages are mapped here; anything unknown is shown as the server sent it.
 * Entries may use capture groups ($1, $2, ...) to carry names and numbers across.
 */
type Entry = { match: RegExp; en: string; tr: string; de: string };

const ENTRIES: Entry[] = [
  { match: /^Username already exists$/i, en: 'Username already exists', tr: 'Bu kullanıcı adı zaten alınmış', de: 'Benutzername bereits vergeben' },
  { match: /^You cannot delete your own account$/i, en: 'You cannot delete your own account', tr: 'Kendi hesabınızı silemezsiniz', de: 'Sie können Ihr eigenes Konto nicht löschen' },
  { match: /^The last (remaining administrator|ADMIN) cannot be (deleted|demoted)/i, en: 'The last admin cannot be deleted or demoted', tr: 'Son yönetici silinemez veya yetkisi düşürülemez', de: 'Der letzte Administrator kann weder gelöscht noch herabgestuft werden' },
  { match: /^Current password is required$/i, en: 'Current password is required', tr: 'Mevcut şifre gerekli', de: 'Das aktuelle Passwort ist erforderlich' },
  { match: /^Current password is incorrect$/i, en: 'Current password is incorrect', tr: 'Mevcut şifre yanlış', de: 'Das aktuelle Passwort ist falsch' },
  { match: /^Insufficient stock for '(.+)': requested (\d+), available (\d+)/i, en: "Insufficient stock for '$1': requested $2, available $3", tr: "Yetersiz stok: '$1' için istenen $2, mevcut $3", de: "Nicht genügend Bestand für '$1': angefordert $2, verfügbar $3" },
  { match: /^Product not found/i, en: 'Product not found', tr: 'Ürün bulunamadı', de: 'Produkt nicht gefunden' },
  { match: /^Supplier not found/i, en: 'Supplier not found', tr: 'Tedarikçi bulunamadı', de: 'Lieferant nicht gefunden' },
  { match: /^Movement not found/i, en: 'Movement not found', tr: 'Hareket bulunamadı', de: 'Bewegung nicht gefunden' },
  { match: /^User not found/i, en: 'User not found', tr: 'Kullanıcı bulunamadı', de: 'Benutzer nicht gefunden' },
  { match: /^Reason code is required for a reversal$/i, en: 'Reason code is required', tr: 'Sebep kodu zorunludur', de: 'Ein Ursachencode ist erforderlich' },
  { match: /^Unit cost (cannot be negative|must be zero or positive)$/i, en: 'Unit cost cannot be negative', tr: 'Birim maliyet negatif olamaz', de: 'Die Stückkosten dürfen nicht negativ sein' },
  { match: /^Movement type is required$/i, en: 'Movement type is required', tr: 'Hareket türü gerekli', de: 'Bewegungstyp ist erforderlich' },
  { match: /^Product id is required$/i, en: 'Product is required', tr: 'Ürün gerekli', de: 'Produkt ist erforderlich' },
  { match: /^Quantity is required$/i, en: 'Quantity is required', tr: 'Miktar gerekli', de: 'Menge ist erforderlich' },
  { match: /^Quantity must be at least 1$/i, en: 'Quantity must be at least 1', tr: 'Miktar en az 1 olmalı', de: 'Die Menge muss mindestens 1 betragen' },
  { match: /^(Received quantity|Consumed quantity|Consumption) must be positive/i, en: 'Quantity must be positive', tr: 'Miktar pozitif olmalı', de: 'Die Menge muss positiv sein' },
  { match: /^Authentication is required/i, en: 'Please sign in again', tr: 'Lütfen tekrar giriş yapın', de: 'Bitte melden Sie sich erneut an' },
];

/** Translate a known backend message; unknown messages are returned unchanged. */
export function translateServerMessage(lang: Lang, message: string): string {
  const text = message.trim();
  for (const entry of ENTRIES) {
    const m = entry.match.exec(text);
    if (m) return entry[lang].replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '');
  }
  return message;
}
