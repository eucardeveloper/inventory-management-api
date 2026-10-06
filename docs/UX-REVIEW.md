# UX-REVIEW.md — WMS Frontend Denetim Raporu

> Tarih: 2026-10-05  
> İnceleyici: Claude Sonnet 4.6  
> Kapsam: `frontend/warehouse-app` — Next.js 16 / MUI v5 / TanStack Query

---

## 1. Mimari Değerlendirme

### Mevcut Durum
- **Tek monolitik dosya:** `src/components/WmsApp.tsx` (~152 KB, ~3000 satır) ve `src/app/page.tsx` (~152 KB) — ikisi neredeyse aynı içerik, muhtemelen kopyalanmış.
- `src/app/` altındaki route klasörleri (dashboard/, products/, vb.) boş ya da sadece yönlendirme yapıyor; gerçek kod WmsApp.tsx'te.
- `src/lib/` ve `src/context/` klasörleri boş.

### Riskler
- 152KB tek dosya → IDE performansı düşük, code review neredeyse imkânsız.
- `page.tsx` ile `WmsApp.tsx` senkronizasyon riski.
- Tailwind devDependency'de var ama globals.css'de kullanılmıyor (MUI seçilmiş, Tailwind gereksiz).

---

## 2. Sayfa Bazlı Eksik Listesi

### 2.1 Login Sayfası
| # | Eksik / Sorun | Öncelik |
|---|--------------|---------|
| L1 | Demo hesap bilgileri küçük tooltip'te gizlenmiş; mülakat demosunda kolayca gözden kaçabilir | Yüksek |
| L2 | Form `autocomplete="off"` → tarayıcı kayıt yöneticisi çalışmıyor | Orta |
| L3 | Enter tuşuyla giriş çalışıyor ama `form` elementi yok, yalnızca `onKeyDown` | Orta |
| L4 | Hata mesajı genel ("Login failed") — backend 401 vs 403 ayrımı gösterilmiyor | Orta |
| L5 | Şifre göster/gizle butonu yok | Düşük |

### 2.2 Dashboard
| # | Eksik / Sorun | Öncelik |
|---|--------------|---------|
| D1 | KPI kartlarda "bugünkü hareket sayısı" yok (görev 3'te istenmiş) | Yüksek |
| D2 | "Dikkat gerektirenler" paneli yok — kritik stok uyarıları inline gösterilmiyor | Yüksek |
| D3 | Stok değerinin kategoriye göre dağılımı grafiği yok | Orta |
| D4 | Trend grafiği var ama hover tooltip'i yok | Orta |
| D5 | Dashboard'da son hareketler akışı pasif (sayfa değiştiriyor, liste göstermiyor) | Orta |
| D6 | KPI yükleniyor durumunda skeleton yok, boş sayı gösteriyor | Orta |

### 2.3 Ürünler
| # | Eksik / Sorun | Öncelik |
|---|--------------|---------|
| P1 | Filtreler URL'de tutulmuyor — sayfa yenilenince sıfırlanıyor | Yüksek |
| P2 | Ürün detay sayfası yok — lot listesi (FIFO), hareket geçmişi, stok trendi | Yüksek |
| P3 | Kategori filtresi yok (backend'de alan var mı kontrol edilmeli) | Orta |
| P4 | Tablo sütunları mobilde çok dar, yatay kaydırma var ama fark edilmiyor | Orta |
| P5 | Aktif/pasif toggle için PATCH endpoint kullanılmıyor, PUT ile güncelleniyor | Düşük |

### 2.4 Hareketler
| # | Eksik / Sorun | Öncelik |
|---|--------------|---------|
| M1 | Hareket formu: ürün seçince anlık stok bilgisi gösterilmiyor | Yüksek |
| M2 | OUT hareketi için FIFO maliyet önizlemesi yok | Yüksek |
| M3 | Yetersiz stok hatası genel toast, detay yok ("Mevcut stok: 5, İstenen: 10" gibi) | Yüksek |
| M4 | Hareket iptali `reasonCode` text input, önceden tanımlı seçenekler yok | Orta |
| M5 | Filtreler URL'de tutulmuyor | Orta |
| M6 | Reversal hareketi "R" badge'i var ama neyin iptaliyse linki yok | Düşük |

### 2.5 Tedarikçiler
| # | Eksik / Sorun | Öncelik |
|---|--------------|---------|
| S1 | Silme işleminde ConfirmDialog var ama silinecek tedarikçi adı gösterilmiyor | Orta |
| S2 | Tedarikçiye ait ürün listesi gösterilmiyor | Düşük |

### 2.6 Raporlar
| # | Eksik / Sorun | Öncelik |
|---|--------------|---------|
| R1 | Export butonları var ama PDF/Excel çalışmıyor (stub) | Yüksek |
| R2 | FIFO değeri sadece StockReport'tan geliyor; birim lot maliyeti gösterilmiyor | Orta |
| R3 | Tarih filtresi yok | Orta |

### 2.7 Denetim Günlüğü (Audit Log)
| # | Eksik / Sorun | Öncelik |
|---|--------------|---------|
| A1 | Filtreler çok sayıda ama mobilde taşıyor | Orta |
| A2 | Tarih aralığı native `<input type="date">` kullanıyor, tutarsız görünüm | Düşük |

### 2.8 Kullanıcı Yönetimi
| # | Eksik / Sorun | Öncelik |
|---|--------------|---------|
| U1 | Şifre değiştirme dialogunda yeni şifre güç göstergesi yok | Düşük |
| U2 | Kullanıcı ekleme özelliği yok (yalnızca rol/şifre değiştirme, silme) | Orta |

---

## 3. Genel UX Eksikleri

| # | Eksik | Öncelik |
|---|-------|---------|
| G1 | Komut paleti (Ctrl+K) yok | Yüksek |
| G2 | Oturum süresi dolunca sessiz yönlendirme (401 hatası da generic toast gösteriyor) | Yüksek |
| G3 | Formlar `Enter` ile submit edilemiyor (bazıları) | Orta |
| G4 | Focus stilleri zayıf — klavye ile gezinirken hangi element odakta belirsiz | Orta |
| G5 | Toast süresi çok kısa (2s) — uzun hata mesajları okunmuyor | Orta |
| G6 | Çift tıklama koruması eksik — hızlı tıklamada çift kayıt oluşabiliyor | Orta |
| G7 | "Geri" butonu / breadcrumb yok | Düşük |

---

## 4. Tasarım Tutarsızlıkları

| # | Sorun |
|---|-------|
| T1 | KPI kartları gradient kullanıyor, tablolar düz — farklı tasarım dili |
| T2 | Dialog boyutları tutarsız (sm, md, lg karışık) |
| T3 | Bazı butonlar `variant="contained"`, bazıları `variant="outlined"` tutarsız |
| T4 | Tarih formatı bazı yerlerde ISO (2024-01-15), bazı yerlerde locale (Jan 15) |
| T5 | Sidebar genişliği (230px) ile içerik boşluğu tutarsız (xs'de 2, md'de 3) |

---

## 5. Mobil & Erişilebilirlik

| # | Sorun |
|---|-------|
| MOB1 | Tablolar mobilde yatay kaydırma gerektiriyor, kart görünümü yok |
| MOB2 | Sidebar mobilde drawer, ama overlay'i kapatmak için geri tuşu çalışmıyor |
| ACC1 | Dialog'lar `aria-labelledby` kullanıyor ama form alanlarında `aria-describedby` eksik |
| ACC2 | Grafik SVG'lerinde `role="img"` ve `aria-label` yok |
| ACC3 | Renk tek başına anlam taşıyan yerler var (IN=yeşil, OUT=kırmızı) — ikon eklenmeli |

---

## 6. Performans

| # | Sorun |
|---|-------|
| PERF1 | `useMovements` varsayılan `size=50` — büyük veri setinde yavaşlayabilir |
| PERF2 | Trend grafiği her render'da `movements.filter()` çalıştırıyor, `useMemo` var ama bağımlılık dizisi kontrol edilmeli |
| PERF3 | WmsApp.tsx tek dosya → Next.js code splitting etkin değil |

---

## 7. Eklenecek Kütüphaneler

Görev kuralı: gereksiz kütüphane ekleme. Aşağıdakiler zorunlu işlevsellik için:

| Kütüphane | Neden | Alternatif |
|-----------|-------|-----------|
| `exceljs` | Excel export (PDF için jspdf) | none — stub bırakılabilir |
| `cmdk` | Komut paleti (Ctrl+K) | MUI Dialog ile custom implementasyon (tercih) |

Karar: **Yeni kütüphane eklenmeyecek.** Excel/PDF export native API ile (CSV için `Blob`, basit HTML→PDF için `window.print`) implement edilecek. Komut paleti MUI Dialog + keyboard handler ile yapılacak.

---

## 8. Yapılacaklar Özeti (Öncelik Sırası)

1. D1, D2 — Dashboard KPI + uyarı paneli
2. M1, M2, M3 — Hareket formu FIFO önizleme + stok kontrolü  
3. G1 — Komut paleti
4. G2 — Session timeout yönlendirme
5. G6 — Çift tıklama koruması
6. R1 — Export (CSV çalışır, PDF basit)
7. P1, M5 — URL filtreler
8. MOB1 — Mobil kart görünümü (tablolar)
9. ACC1-3 — ARIA iyileştirmeleri
