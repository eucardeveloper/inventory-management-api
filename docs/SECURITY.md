# Güvenlik Notu

Bu belge mevcut repository kodunun tehdit modelini ve bilinen sınırlarını özetler. Production altyapısı ayrıca doğrulanmadığı için yalnızca kodda görülen kontroller anlatılmıştır.

## Tehdit modeli özeti

- **Token saklama:** Access JWT ve refresh token backend tarafından HttpOnly cookie olarak set edilir. Frontend `credentials: 'include'` kullanır ve token'ı `localStorage`/`sessionStorage` içine yazmaz. API istemcileri için `Authorization: Bearer` fallback'i de vardır.
- **XSS:** HttpOnly cookie token'ın JavaScript tarafından okunmasını engeller. Bu, XSS'i ortadan kaldırmaz; uygulama girdileri, dependency'ler ve frontend output encoding ayrıca korunmalıdır.
- **CSRF:** Security config CSRF'yi disable eder. Cookie'lerde `SameSite=Lax` bulunur ve CORS belirli localhost origin'leriyle sınırlıdır. Ayrı bir CSRF token kontrolü yoktur.
- **Yetkilendirme:** Backend HTTP method matcher'ları ve controller `@PreAuthorize` ile `ADMIN`, `WAREHOUSE_MANAGER`, `STAFF` rollerini uygular. Frontend middleware rol bilgisini JWT payload'ından okuyarak kullanıcı arayüzünü yönlendirir; backend authorization'ın yerine geçmez.
- **Refresh token:** Token rastgele üretilir, BCrypt hash olarak saklanır, rotation sırasında satır kilidi kullanılır ve revoked eşleşmede kullanıcı token'ları iptal edilir. Eşzamanlı refresh davranışı için doğrudan integration testi hâlâ eksiktir.
- **Audit:** Auditable servis çağrıları AOP ile yakalanır; başarılı çağrıların audit kayıtları async olarak ayrı transaction'da yazılır. Audit yazma hatası business işlemini başarısız yapmaz.
- **Rate limit:** Repository içinde login rate limit, brute-force sayacı veya hesap kilitleme mekanizması bulunmuyor.

## Bilinen sınırlar

1. Cookie `Secure` değeri `JWT_COOKIE_SECURE` ile konfigüre edilir; local varsayılan `false` olduğu için production deployment bunu `true` vermek zorundadır.
2. JWT secret, PostgreSQL parolası, Grafana parolası ve demo kullanıcı parolaları local/demo varsayılanları içeriyor. Bunlar production sırrı değildir.
3. CSRF tamamen kapalıdır; SameSite/CORS tek başına tüm deployment topolojileri için yeterli savunma olarak kabul edilmemelidir.
4. Login endpoint'i için rate limit veya hesap kilitleme yoktur.
5. Refresh token rotation/reuse detection için unit testi vardır; eşzamanlı refresh ve controller response/cookie davranışı için integration test yoktur.
6. Frontend middleware JWT imzasını doğrulamaz; gerçek güvenlik sınırı backend'dir.
7. Audit yazımı asenkron olduğundan yazma hatasında kayıt kaybı mümkün olabilir.
8. Reverse proxy, TLS, WAF, secret manager, backup ve ağ izolasyonu bu repository'den doğrulanamaz.

## Production kontrol listesi

- `JWT_SECRET`, DB ve Grafana sırlarını secret manager/CI secret üzerinden verin.
- TLS termination arkasında `JWT_COOKIE_SECURE=true` ayarını zorunlu kılın.
- CSRF/origin politikasını seçin ve browser integration testi ekleyin.
- Login rate limit ve refresh reuse testlerini çalıştırın.
- Actuator endpoint'lerini ağ erişimi ve role policy ile sınırlandırın.
