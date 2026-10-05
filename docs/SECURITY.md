# Güvenlik Notu

Bu belge mevcut repository kodunun tehdit modelini ve bilinen sınırlarını özetler. Production altyapısı ayrıca doğrulanmadığı için yalnızca kodda görülen kontroller anlatılmıştır.

## Tehdit modeli özeti

- **Token saklama:** Access JWT ve refresh token backend tarafından HttpOnly cookie olarak set edilir. Frontend `credentials: 'include'` kullanır ve token'ı `localStorage`/`sessionStorage` içine yazmaz. API istemcileri için `Authorization: Bearer` fallback'i de vardır.
- **XSS:** HttpOnly cookie token'ın JavaScript tarafından okunmasını engeller. Bu, XSS'i ortadan kaldırmaz; uygulama girdileri, dependency'ler ve frontend output encoding ayrıca korunmalıdır.
- **CSRF:** Security config CSRF'yi disable eder. Cookie'lerde `SameSite=Lax` bulunur ve CORS belirli localhost origin'leriyle sınırlıdır. Ayrı bir CSRF token kontrolü yoktur.
- **Yetkilendirme:** Backend HTTP method matcher'ları ve controller `@PreAuthorize` ile `ADMIN`, `WAREHOUSE_MANAGER`, `STAFF` rollerini uygular. Frontend middleware rol bilgisini JWT payload'ından okuyarak kullanıcı arayüzünü yönlendirir; backend authorization'ın yerine geçmez.
- **Refresh token:** Token rastgele üretilir, BCrypt hash olarak saklanır, rotation sırasında satır kilidi ve atomik tek-kullanım güncellemesi kullanılır; revoked eşleşmede kullanıcı token'ları iptal edilir. Eşzamanlı HTTP refresh davranışı Testcontainers/PostgreSQL integration testiyle doğrulanır.
- **Audit:** Auditable servis çağrıları AOP ile yakalanır; başarılı çağrıların audit kayıtları async olarak ayrı transaction'da yazılır. Audit yazma hatası business işlemini başarısız yapmaz.
- **Rate limit:** Login başarısızlıkları kullanıcı adı + istemci IP'si ile yapılandırılabilir bir pencere ve geçici 423 kilidiyle sınırlandırılır. Sayaçlar process belleğindedir; çoklu instance dağıtımında ortak Redis/database tabanlı store olmadan instance'lar arasında paylaşılmaz.

## Bilinen sınırlar

1. Cookie `Secure` değeri `JWT_COOKIE_SECURE` ile konfigüre edilir; local varsayılan `false` olduğu için production deployment bunu `true` vermek zorundadır.
2. JWT secret, PostgreSQL parolası, Grafana parolası ve demo kullanıcı parolaları local/demo varsayılanları içeriyor. Bunlar production sırrı değildir.
3. CSRF tamamen kapalıdır; SameSite/CORS tek başına tüm deployment topolojileri için yeterli savunma olarak kabul edilmemelidir.
4. Login rate limit process belleğindedir; çoklu instance ortamında merkezi rate-limit store gerekir.
5. Frontend middleware JWT imzasını doğrulamaz; gerçek güvenlik sınırı backend'dir.
6. Audit yazımı asenkron olduğundan yazma hatasında kayıt kaybı mümkün olabilir.
7. Reverse proxy, TLS, WAF, secret manager, backup ve ağ izolasyonu bu repository'den doğrulanamaz.

## Production kontrol listesi

- `JWT_SECRET`, DB ve Grafana sırlarını secret manager/CI secret üzerinden verin.
- TLS termination arkasında `JWT_COOKIE_SECURE=true` ayarını zorunlu kılın.
- CSRF/origin politikasını seçin ve browser integration testi ekleyin.
- Merkezi rate-limit store'u çoklu instance dağıtımında devreye alın ve refresh reuse/cross-instance senaryolarını çalıştırın.
- Actuator endpoint'lerini ağ erişimi ve role policy ile sınırlandırın.
