# WMS Presentation / WMS-Präsentation

## 5-minute demo / 5-Minuten-Demo

| Time | Türkçe başlık | Deutscher Titel | Gösterilecek | Öne çıkan teknik karar |
|---:|---|---|---|---|
| 0:00–0:40 | Giriş ve roller | Einstieg und Rollen | Login ekranında `admin`, `warehouse`, `staff` hesaplarını ve farklı menüleri gösterin. | JWT HttpOnly cookie, refresh token ve RBAC |
| 0:40–1:30 | Ürün ve tedarikçi | Produkte und Lieferanten | Admin olarak ürün/tedarikçi oluşturun; staff'ın yönetim ekranına erişemediğini gösterin. | HTTP method matcher + `@PreAuthorize` |
| 1:30–2:30 | FIFO stok girişi | FIFO-Wareneingang | Aynı ürüne farklı maliyetlerle iki IN hareketi girin. | Her giriş için ayrı lot ve tarih/maliyet izlenebilirliği |
| 2:30–3:30 | FIFO stok çıkışı | FIFO-Warenausgang | Eski lotu aşan bir OUT hareketi girin ve lot tüketim satırlarını gösterin. | `PESSIMISTIC_WRITE`, atomik transaction ve FIFO COGS |
| 3:30–4:10 | Reversal ve audit | Rückbuchung und Audit | Supervisor olarak hareketi reason code ile reverse edin; ledger'da iki kaydı gösterin. | Append-only ledger ve AOP audit |
| 4:10–4:40 | Raporlama ve izleme | Reporting und Monitoring | FIFO stok raporu, Prometheus ve Grafana dashboard'ını açın. | Actuator metrics ve operasyonel görünürlük |
| 4:40–5:00 | CI/CD ve kapanış | CI/CD und Abschluss | GitHub Actions CI, Testcontainers job'ı ve README/ADR belgelerini gösterin. | Gerçek PostgreSQL ile entegrasyon testi |

## Teknik sorular ve kısa cevaplar

1. **Neden `PESSIMISTIC_WRITE`?** Aynı ürünün açık lotları read-modify-write işlemidir; PostgreSQL `SELECT FOR UPDATE` ile aynı ürün üzerindeki eşzamanlı tüketimleri sıraya alır.
2. **Isolation level nedir?** Kod özel bir isolation level ayarlamıyor; PostgreSQL/Spring varsayılanı kullanılıyor. Tutarlılığın kritik kısmı transaction sınırı ve satır kilididir.
3. **FIFO nasıl çalışıyor?** Her IN ayrı `stock_lot` açar; OUT lotları `received_at ASC, id ASC` sırasıyla tüketir ve her lot katkısını ledger detail'e yazar.
4. **JWT nerede tutuluyor?** Access ve refresh token HttpOnly cookie'de; API istemcileri için access JWT response body/Bearer fallback'i de mevcut.
5. **Refresh token güvenliği nedir?** Rastgele opaque token üretilir ve BCrypt hash saklanır; rotation hedeflenmiştir. Mevcut reuse dalı için AUDIT.md'deki sınıra bakılmalıdır.
6. **Deadlock olabilir mi?** Aynı ürün hareketleri sabit ürün/lot kilitleme düzeniyle seri hale gelir; reversal yarışları için ayrıca test ve lock policy gerekir.
7. **Negatif stok nasıl engelleniyor?** FIFO motoru tüketimden önce toplam kullanılabilirliği kontrol eder; concurrency integration testi PostgreSQL üzerinde bunu sınar. DB CHECK constraint mevcut değildir.
8. **Aynı istek iki kez gelirse?** İstemci `idempotencyKey` gönderirse unique constraint ve yarış yakalama ikinci kaydı engeller; anahtar opsiyoneldir.
9. **Reversal neden yeni lot açmıyor?** OUT reversal tüketilen miktarı aynı lotlara geri koyar; böylece FIFO sırası ve maliyet pozisyonu korunur.
10. **Audit neden AOP?** `@Auditable` işaretli başarılı servis çağrılarını merkezi olarak yakalar; business servislerinde tekrar eden audit kodunu azaltır. Yazım async olduğu için kayıp riski ayrıca belgelenmiştir.
