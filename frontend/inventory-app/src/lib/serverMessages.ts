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
  { match: /^Unit cost allows at most 15 digits/i, en: 'Unit cost allows at most 4 decimal places', tr: 'Birim maliyet en fazla 4 ondalık basamak içerebilir', de: 'Die Stückkosten dürfen höchstens 4 Nachkommastellen haben' },
  { match: /^Movement type is required$/i, en: 'Movement type is required', tr: 'Hareket türü gerekli', de: 'Bewegungstyp ist erforderlich' },
  { match: /^Product id is required$/i, en: 'Product is required', tr: 'Ürün gerekli', de: 'Produkt ist erforderlich' },
  { match: /^Quantity is required$/i, en: 'Quantity is required', tr: 'Miktar gerekli', de: 'Menge ist erforderlich' },
  { match: /^Quantity must be at least 1$/i, en: 'Quantity must be at least 1', tr: 'Miktar en az 1 olmalı', de: 'Die Menge muss mindestens 1 betragen' },
  { match: /^(Received quantity|Consumed quantity|Consumption) must be positive/i, en: 'Quantity must be positive', tr: 'Miktar pozitif olmalı', de: 'Die Menge muss positiv sein' },
  // Bean Validation answers in the browser's language (Accept-Language), not the app's, so both forms are matched.
  { match: /(well-formed email|düzgün biçimli bir e-posta|wohlgeformte E-Mail)/i, en: 'Enter a valid email address', tr: 'Geçerli bir e-posta adresi girin', de: 'Geben Sie eine gültige E-Mail-Adresse ein' },
  { match: /^(must not be blank|must not be empty|boş olmamalı|boş bırakılamaz)/i, en: 'This field is required', tr: 'Bu alan zorunlu', de: 'Dieses Feld ist erforderlich' },
  { match: /(size must be between (\d+) and (\d+)|(\d+) ile (\d+) arasında olmalı)/i, en: 'Length is outside the allowed range', tr: 'Uzunluk izin verilen aralığın dışında', de: 'Die Länge liegt außerhalb des erlaubten Bereichs' },
  { match: /^The request conflicts with existing data/i, en: 'This conflicts with existing data (for example the product code or e-mail is already in use)', tr: 'Bu kayıt mevcut bir veriyle çakışıyor (örneğin aynı ürün kodu ya da e-posta zaten kullanımda)', de: 'Das steht im Konflikt mit vorhandenen Daten (z. B. Artikelnummer oder E-Mail bereits vergeben)' },
  { match: /^Movement (\d+) has already been reversed by movement (\d+)/i, en: 'Movement $1 has already been reversed (by movement $2)', tr: 'Hareket $1 zaten geri alınmış (geri alan hareket: $2)', de: 'Bewegung $1 wurde bereits storniert (durch Bewegung $2)' },
  { match: /^Movement (\d+) is itself a reversal and cannot be reversed/i, en: 'Movement $1 is a reversal and cannot be reversed', tr: 'Hareket $1 bir iptal kaydıdır, geri alınamaz', de: 'Bewegung $1 ist selbst eine Stornierung und kann nicht storniert werden' },
  { match: /^One or more fields are invalid$/i, en: 'One or more fields are invalid', tr: 'Bir veya daha fazla alan geçersiz', de: 'Ein oder mehrere Felder sind ungültig' },
  { match: /^Product is inactive; reactivate it before recording stock movements/i, en: 'The product is inactive; reactivate it before recording stock movements', tr: 'Ürün pasif; stok hareketi girmeden önce yeniden etkinleştirin', de: 'Das Produkt ist inaktiv; reaktivieren Sie es vor der Buchung' },
  { match: /^The record was changed by someone else/i, en: 'The record was changed by someone else. Reload and try again', tr: 'Kayıt başka biri tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin', de: 'Der Datensatz wurde von jemand anderem geändert. Neu laden und erneut versuchen' },
  { match: /^You do not have permission to perform this action$/i, en: 'You do not have permission to perform this action', tr: 'Bu işlem için yetkiniz yok', de: 'Sie haben keine Berechtigung für diese Aktion' },
  { match: /^Too many sign-in attempts for this account/i, en: 'Too many sign-in attempts for this account. Try again later', tr: 'Bu hesap için çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin', de: 'Zu viele Anmeldeversuche für dieses Konto. Bitte später erneut versuchen' },
  { match: /^You can only change your own password$/i, en: 'You can only change your own password', tr: 'Yalnızca kendi şifrenizi değiştirebilirsiniz', de: 'Sie können nur Ihr eigenes Passwort ändern' },
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
