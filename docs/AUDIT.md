# Bağımsız Teknik Denetim

## Son durum yeniden değerlendirmesi

Bu rapordaki ilk bulgular önceki çalışma ağacının fotoğrafıdır. Aşağıdaki bulgular sonradan doğrulanıp kapatıldı:

- Origin/Referer koruması eklendi; yapılandırılmış izinli origin dışındaki durum değiştiren HTTP istekleri 403 döner.
- Controller authorization matrisi ve anonim 401 davranışı gerçek MockMvc security-chain testleriyle kapsandı.
- Refresh rotation atomik `revokeIfActive` güncellemesine taşındı; paralel aynı-token testinde sonuç `[200, 400]` oldu.
- Login rate limit eklendi: varsayılan 5 deneme, 60 saniye pencere, 300 saniye kilit ve HTTP 423. Store process-local olduğu için çoklu instance sınırı devam eder.
- Audit AOP yazımı async fire-and-forget olmaktan çıkarıldı; business transaction içinde senkron persistence kullanıyor.
- Backend doğrulaması Docker Desktop ile 45 test, 0 failure, 0 error, 0 skipped olarak tamamlandı.
- Frontend lint ve production build başarılıdır. `npm audit` critical bulgu 0'a indi; `eslint-config-next` transitif zincirindeki 5 high bulgu için güvenli non-breaking npm çözümü bulunmadı ve `--force` kullanılmadı.

Kapatılan bulgular aşağıdaki tarihsel tablolarda tekrar açık risk gibi okunmamalıdır; kalan sınırlar "Bilinen sınırlar" bölümündedir.

> Kapsam: Bu rapor mevcut backend, frontend, veritabanı migration'ları, Docker Compose, CI ve testleri inceler. Tarihsel bulgular ilk audit çalışma ağacına, "Son durum yeniden değerlendirmesi" ise güncel doğrulamaya aittir.

## Yönetici özeti

Sunum veya üretim kullanımı öncesinde özellikle cookie güvenliği, varsayılan sırlar, CSRF yaklaşımı ve refresh-token reuse akışı ele alınmalıdır. Stok hareketlerinde transaction ve ürün/lots kilitleme yaklaşımı mevcut olsa da reversal ve refresh işlemlerinin eşzamanlı davranışı için doğrudan controller/security testleri yoktur. Audit kayıtları bilinçli olarak asenkron yazıldığı için kayıt kaybı ve hata görünürlüğü riski taşır.

## Bulgular

### Güvenlik

| Önem | Dosya ve satır | Sorun | Somut düzeltme | Emin misin |
|---|---|---|---|---|
| Yüksek | [AuthService.java:154-165](../src/main/java/com/enesucar/inventory/service/AuthService.java:154) | Cookie güvenliği artık `JWT_COOKIE_SECURE` ile konfigüre edilebilir; local varsayılan `false` kalıyor. Production deployment bu değeri açıkça `true` vermezse cookie transport güvenliği zayıf kalır. | Production secret/config içinde `JWT_COOKIE_SECURE=true` zorunlu kılınmalı; TLS termination ve cookie attribute'ları deployment testinde doğrulanmalı. | Evet |
| Yüksek | [docker-compose.yml:14-15, 42-43, 88](../docker-compose.yml:14) · [application.properties:21](../src/main/resources/application.properties:21) | PostgreSQL parolası, Grafana parolası ve JWT secret için çalışır varsayılanlar repository'de açıkça tanımlı. Bunlar local demo için anlaşılır olsa da Compose komutu production benzeri çalıştırılırsa tahmin edilebilir sırlarla başlar. | Compose'u `.env` olmadan başlatmayı reddedin veya yalnızca açıkça development profiline bağlayın; production secret'ları secret manager/CI secret üzerinden zorunlu alın; demo hesaplarını production seed'inden ayırın. | Evet |
| Yüksek | [SecurityConfig.java:39](../src/main/java/com/enesucar/inventory/security/SecurityConfig.java:39) · [AuthService.java:157,167](../src/main/java/com/enesucar/inventory/service/AuthService.java:157) | CSRF tamamen kapalı ve kimlik doğrulama cookie ile yapılıyor. `SameSite=Lax` bazı cross-site POST'ları sınırlar, fakat cookie tabanlı state-changing endpoint'ler için uygulama seviyesinde CSRF token veya eşdeğer origin kontrolü yok. | Cookie authentication korunacaksa CSRF token/double-submit veya güvenilir `Origin`/`Referer` kontrolü ekleyin; `SameSite` politikasını deployment gereksinimine göre bilinçli test edin. | Evet |
| Orta | [RefreshTokenService.java:72-105](../src/main/java/com/enesucar/inventory/service/RefreshTokenService.java:72) · [AuthService.java:98-106](../src/main/java/com/enesucar/inventory/service/AuthService.java:98) | Rotation artık eşleşen token satırını pessimistic lock ile alıyor ve revoked eşleşmede tüm kullanıcı token'larını iptal ediyor. Ancak `/refresh` ön doğrulaması ile rotation aynı üst akışta iki servis çağrısıdır; eşzamanlı refresh davranışı için doğrudan integration testi hâlâ yoktur. | Token ailesi/jti veya hızlı hash ile atomik consume-and-rotate yaklaşımını tamamlayın; iki eşzamanlı refresh isteğini integration test ile kanıtlayın. | Evet |
| Orta | [AuthService.java:64-80](../src/main/java/com/enesucar/inventory/service/AuthService.java:64) · [SecurityConfig.java:39-70](../src/main/java/com/enesucar/inventory/security/SecurityConfig.java:39) | Login için rate limit, başarısız deneme sayacı veya hesap kilitleme yok. `AuthenticationManager` hatalı parolayı reddediyor ancak brute-force maliyeti/IP-kullanıcı bazlı sınırlanmıyor. | Reverse proxy/API gateway veya uygulama seviyesinde login rate limit, başarısız deneme metriği ve geçici kilitleme ekleyin; lockout'un müşteri operasyonunu kilitlememesi için kurtarma prosedürü tanımlayın. | Evet |
| Orta | [JwtFilter.java:52-70](../src/main/java/com/enesucar/inventory/security/JwtFilter.java:52) · [middleware.ts:34-75](../frontend/warehouse-app/src/middleware.ts:34) | Backend imzayı doğruluyor; frontend middleware ise JWT payload'ını yalnızca Base64 decode ederek UI route kararı veriyor. Bu UI erişim kontrolü olarak kullanılabilir, fakat güven sınırı değildir. API doğrudan çağrılabildiği için asıl yetkilendirme backend'de kalmalıdır; frontend'deki rol manipülasyonu yalnızca yanlış yönlendirme/ekran gösterimi etkisi yaratır. | Dokümantasyonda middleware'i güvenlik kontrolü değil UX filtresi olarak belirtin; controller/API authorization için MockMvc testleri ekleyin. | Evet |
| Düşük | [JwtFilter.java:55-70](../src/main/java/com/enesucar/inventory/security/JwtFilter.java:55) | Username ve rol bilgisi `INFO` seviyesinde loglanıyor. Token değeri loglanmıyor; yine de production loglarında kullanıcı/rol korelasyonu gereksiz veri olabilir. | Kimlik bilgisi log seviyesini `DEBUG`/structured audit correlation seviyesine indirin; log retention ve erişim politikasını uygulayın. | Evet |

### Yetkilendirme ve IDOR

| Önem | Dosya ve satır | Sorun | Somut düzeltme | Emin misin |
|---|---|---|---|---|
| Orta | [SecurityConfig.java:47-70](../src/main/java/com/enesucar/inventory/security/SecurityConfig.java:47) · [*Controller.java](../src/main/java/com/enesucar/inventory/controller) | Yetkiler ağırlıklı olarak HTTP security matcher'ları ve controller `@PreAuthorize` anotasyonlarında. Servis metotlarında aynı yetki politikası yok. Bugün public controller'lar üzerinden erişim kısıtlanıyor; ancak servisler başka bir giriş noktasından çağrılırsa güvenlik politikası otomatik taşınmıyor. | Kritik servis operasyonlarına method-level authorization ekleyin veya açık bir application-service boundary kullanın; controller ve service çağrılarını ayrı test edin. | Evet |
| Orta | [StockMovementController.java:34-48](../src/main/java/com/enesucar/inventory/controller/StockMovementController.java:34) · [StockMovementService.java:53-75](../src/main/java/com/enesucar/inventory/service/StockMovementService.java:53) | Ledger sorguları `productId`, hareket tipi ve tarih parametrelerini alıyor; servis içinde `type`, `from`, `to` parametreleri kullanılmıyor. Bu doğrudan yetkisiz erişim kanıtı değildir, ancak beklenen filtreleme sözleşmesi ile uygulama arasında boşluk oluşturur ve çok geniş veri döndürme riskini artırır. | Filtreleri repository sorgusuna bağlayın veya desteklenmiyorsa endpoint sözleşmesinden kaldırın; sayfa boyutu üst sınırı ve authorization testleri ekleyin. | Evet |
| Düşük | [AuditLogController.java:29-37](../src/main/java/com/enesucar/inventory/controller/AuditLogController.java:29) | Audit log okuma yetkisi `ADMIN` ve `WAREHOUSE_MANAGER` rollerine açık. Ürün/operasyon verisinden daha hassas kabul edilen audit verisi için bu kararın bilinçli olduğu kodda açıklanmıyor; bu bir politika doğrulama ihtiyacıdır. | İş gereksinimiyle teyit edin; gerekiyorsa yalnızca `ADMIN` veya alan bazlı maskeleme uygulayın. | Tahmin |

### Veri bütünlüğü ve concurrency

| Önem | Dosya ve satır | Sorun | Somut düzeltme | Emin misin |
|---|---|---|---|---|
| Orta | [StockMovementService.java:173-225](../src/main/java/com/enesucar/inventory/service/StockMovementService.java:173) | `reverseMovement` transaction içinde olsa da original movement yüklenirken veya OUT lotları restore edilirken product/lots için aynı tutarlı kilitleme protokolü `recordMovement` kadar açık değil. Aynı movement'a eşzamanlı iki reversal isteği, her ikisinin de `isReversed()` kontrolünü geçme ihtimalini taşır; unique constraint ile engellenen bir koruma görünmüyor. | Original movement için row lock veya reversal üzerinde unique constraint kullanın; aynı movement'a iki eşzamanlı reversal ve reversal ile OUT/IN yarışını PostgreSQL integration testinde doğrulayın. | Tahmin |
| Orta | [V1__init_schema.sql:49-86](../src/main/resources/db/migration/V1__init_schema.sql) · [StockLot.java:81-99](../src/main/java/com/enesucar/inventory/entity/StockLot.java:81) | Veritabanında `quantity > 0`, `remaining_quantity >= 0`, `remaining_quantity <= quantity` veya hareket miktarının pozitifliği için CHECK constraint yok. Uygulama DTO/FIFO katmanında koruma var, fakat migration/SQL ile doğrudan yazım veya gelecekteki bir bug invariant'ı bozabilir. | Kritik invariant'lar için migration ile CHECK constraint ekleyin; mevcut veriyi önce doğrulayıp ihlal varsa migration'ı fail-fast yapın. | Evet |
| Düşük | [StockMovementService.java:93-108](../src/main/java/com/enesucar/inventory/service/StockMovementService.java:93) · [V1__init_schema.sql:58](../src/main/resources/db/migration/V1__init_schema.sql) | Idempotency anahtarı opsiyonel. Anahtar gönderilmezse aynı OUT isteği bilinçli/yanlışlıkla iki kez stoktan düşebilir. Anahtar gönderildiğinde unique constraint ve yarış durumundaki yakalama mevcut, ancak istemciyi anahtar göndermeye zorlayan bir politika yok. | Mutasyon endpoint'lerinde idempotency anahtarını zorunlu hale getirin veya istemci SDK'sında her denemede üretin; aynı anahtar için response replay sözleşmesini netleştirin. | Evet |
| Düşük | [V1__init_schema.sql:49-64](../src/main/resources/db/migration/V1__init_schema.sql) · [StockMovementService.java:116-121](../src/main/java/com/enesucar/inventory/service/StockMovementService.java:116) | Movement türü ve `unit_cost` ilişkisi DB seviyesinde kısıtlanmıyor. Uygulama IN için varsayılan sıfır maliyet kullanırken entity kaydında `request.getUnitCost()` yazıyor; null/varsayılan maliyet davranışı raporlama açısından ayrıca netleştirilmeli. | Movement type'a göre DB/app invariant'larını açıkça tanımlayın; IN maliyetinin zorunlu mu sıfır kabul edilebilir mi olduğunu validation ve testle sabitleyin. | Evet |

### Audit ve hata yönetimi

| Önem | Dosya ve satır | Sorun | Somut düzeltme | Emin misin |
|---|---|---|---|---|
| Orta | [AuditAspect.java:57-95](../src/main/java/com/enesucar/inventory/aspect/AuditAspect.java:57) · [AuditLogService.java:73-91](../src/main/java/com/enesucar/inventory/service/AuditLogService.java:73) | Başarılı işlemlerin audit'i asenkron/fire-and-forget yazılıyor; hata yalnızca loglanıyor ve business response başarılı kalıyor. Audit tablosu mevzuat/operasyon açısından zorunlu kanıt ise kayıt kaybı mümkündür. Ayrıca `userId` her zaman `null` atanıyor. | Kritik denetim olaylarını business transaction'a katılan synchronous `REQUIRES_NEW` kayıtla yazın veya durable queue/outbox kullanın; async kaybını metric/alert ile görünür yapın; user ID'yi kimlikten çözün. | Evet |
| Düşük | [AuditAspect.java:104-107](../src/main/java/com/enesucar/inventory/aspect/AuditAspect.java:104) · [RequestTraceFilter.java](../src/main/java/com/enesucar/inventory/filter/RequestTraceFilter.java) | `X-Forwarded-For` ilk değer olarak güveniliyor. Güvenilir proxy listesi/forwarded-header stratejisi olmadan istemci audit IP'sini sahteleyebilir. | Yalnızca güvenilir reverse proxy'den gelen forwarded header'ı kabul edin; proxy dışında remote address'i esas alın ve audit IP'sinin güven seviyesini belgeleyin. | Evet |
| Düşük | [JwtFilter.java:73-76](../src/main/java/com/enesucar/inventory/security/JwtFilter.java:73) · [GlobalExceptionHandler.java:80-90](../src/main/java/com/enesucar/inventory/exception/GlobalExceptionHandler.java:80) | JWT parse/validation hataları filtrede sessizce `DEBUG` seviyesine indiriliyor ve request zinciri devam ediyor. Bu kullanıcıya 401 yerine downstream 403/401 olarak yansıyabilir; izleme ve teşhis bilgisi sınırlı kalır. | Geçersiz token için standart 401 davranışı ve düşük hacimli güvenlik metriği ekleyin; ham token veya hassas parse ayrıntısı loglamayın. | Evet |

### Operasyon ve deployment

| Önem | Dosya ve satır | Sorun | Somut düzeltme | Emin misin |
|---|---|---|---|---|
| Orta | [docker-compose.yml:48-55](../docker-compose.yml:48) | Backend healthcheck var, ancak frontend `depends_on` yalnızca container başlatma sırasına bağlı; backend'in gerçekten hazır olmasını beklemiyor. Prometheus ve Grafana da servis hazır olma durumunu değil yalnızca başlatma sırasını kullanıyor. | Frontend/monitoring için healthcheck tabanlı `condition: service_healthy` veya retry/backoff ekleyin; startup failure senaryosunu smoke test edin. | Evet |
| Orta | [ci.yml:72-85](../.github/workflows/ci.yml:72) | Docker image `package -DskipTests` ile build ediliyor; testler önceki job'larda çalışsa da image build adımı doğrudan aynı artifact'i test etmiyor ve image vulnerability/runtime smoke scan yok. | Test edilen commit/artifact ile image provenance kurun; image scan ve compose smoke test ekleyin. | Evet |
| Düşük | [V1__init_schema.sql](../src/main/resources/db/migration/V1__init_schema.sql) · [V2__seed_demo_data.sql](../src/main/resources/db/migration/V2__seed_demo_data.sql) | Flyway migration'ları ileri yönlü ve seed ağırlıklı. Rollback/down migration yok; hatalı migration veya demo verisi değişikliği için geri dönüş prosedürü repository'de görünmüyor. | Backup/restore ve forward-fix prosedürü yazın; migration'ları immutable kabul edip rollback yerine yeni migration standardı uygulayın. | Evet |
| Düşük | [owasp.yml:43-51](../.github/workflows/owasp.yml:43) | OWASP Dependency Check `continue-on-error: true`; CVSS 7 eşiği aşılırsa bile workflow yeşil kalabilir. Bu bir raporlama taraması, zorlayıcı güvenlik kapısı değil. | Production branch için ayrı fail policy veya issue/alert üretimi ekleyin; suppression dosyasını periyodik gözden geçirin. | Evet |

### Frontend

| Önem | Dosya ve satır | Sorun | Somut düzeltme | Emin misin |
|---|---|---|---|---|
| Orta | [middleware.ts:34-75](../frontend/warehouse-app/src/middleware.ts:34) | Route middleware access token'ın imzasını doğrulamıyor; sahte payload ile kullanıcı arayüzünde rol/route kararı değiştirilebilir. Backend API matcher'ları asıl koruma olarak kaldığı için tek başına backend authorization bypass kanıtı değildir, ancak kullanıcıya sahte güvenlik durumu gösterilebilir. | Middleware'i yalnızca UX yönlendirmesi olarak konumlandırın; kritik ekran verisini API 401/403 yanıtına bağlayın ve browser/API authorization testleri ekleyin. | Evet |
| Düşük | [useWmsQueries.ts:74-91](../frontend/warehouse-app/src/hooks/useWmsQueries.ts:74) · [app/providers.tsx:35-49](../frontend/warehouse-app/src/app/providers.tsx:35) | API hataları genel `Error` metnine çevriliyor; beklenen bazı geçici hata retry davranışı provider seviyesinde olsa da mutation retry, session expiry ve 401 sonrası refresh/logout akışı için merkezi bir interceptor görülmüyor. | 401/403/409 ayrımını merkezi ele alın; refresh başarısızlığında kontrollü logout ve kullanıcıya işlem bağlamı gösterin. | Tahmin |
| Düşük | [WmsApp.tsx:1159-1212](../frontend/warehouse-app/src/components/WmsApp.tsx:1159) | Dil ve tema tercihleri `localStorage`'da tutuluyor. Token localStorage'da tutulmuyor; bu olumlu bir ayrım olsa da XSS için genel uygulama yüzeyi, HTML injection ve dependency hygiene ayrıca korunmalı. | Kullanıcı girdilerinin render noktalarını ve dependency audit'lerini düzenli tarayın; localStorage'ı yalnızca hassas olmayan tercihlerle sınırlayın. | Evet |

## Mevcut testlerin kanıtladıkları

- [FifoInventoryServiceTest.java](../src/test/java/com/enesucar/inventory/service/FifoInventoryServiceTest.java): FIFO sırası, çoklu lot tüketimi, COGS hesabı, yetersiz stokta lotların değişmemesi, pozitif miktar/maliyet validasyonu ve OUT reversal'ın orijinal lotlara dönüşü unit testlerle doğrulanıyor.
- [ConcurrentStockMovementTest.java](../src/test/java/com/enesucar/inventory/integration/ConcurrentStockMovementTest.java): Gerçek PostgreSQL Testcontainer üzerinde eşzamanlı OUT işlemlerinde lost update olmaması, negatif stok oluşmaması ve aynı idempotency key'in ikinci hareket oluşturmaması test ediliyor.
- [InventoryManagementApplicationTests.java](../src/test/java/com/enesucar/inventory/InventoryManagementApplicationTests.java): Test profili ve Testcontainers ile Spring context'in yüklenmesi doğrulanıyor. Bu test endpoint authorization veya business scenario kanıtı değildir.
- [ProductServiceTest.java](../src/test/java/com/enesucar/inventory/ProductServiceTest.java) ve [SupplierServiceTest.java](../src/test/java/com/enesucar/inventory/SupplierServiceTest.java): Service-level listeleme, bulma ve temel kayıt davranışları mock/repository düzeyinde test ediliyor.
- [ArchitectureTest.java](../src/test/java/com/enesucar/inventory/architecture/ArchitectureTest.java): Katmanlar arası bağımlılık ve temel Spring stereotype kuralları doğrulanıyor.

## Test boşlukları

Şu senaryolar için mevcut test ağacında doğrudan controller/security testi görünmüyor:

1. STAFF'ın product/supplier create-update-delete ve reversal endpoint'lerinde 403 alması.
2. WAREHOUSE_MANAGER'ın admin-only user management ve protected Actuator endpoint'lerinde 403 alması.
3. Geçersiz/imzası bozuk/süresi dolmuş cookie ve Bearer token için 401 davranışı.
4. CSRF veya güvenilir origin politikasının gerçekten uygulandığını kanıtlayan test.
5. Refresh token'ın ikinci kez kullanılması ve iki eşzamanlı refresh isteğinin sonucu.
6. Aynı movement için eşzamanlı reversal isteklerinin tek reversal ile sınırlanması.
7. Cookie attribute'larının (`HttpOnly`, `Secure`, `SameSite`, `Path`) HTTP response üzerinde doğrulanması.
8. Login brute-force/rate-limit davranışı; çünkü mevcut uygulamada böyle bir mekanizma görünmüyor.

## Sunumdan önce mutlaka düzeltilmesi gerekenler

1. Production'da `JWT_COOKIE_SECURE=true` ve secret yönetimini zorunlu hale getirin; varsayılan DB/Grafana/JWT sırlarının demo dışına taşınmasını engelleyin.
2. Cookie tabanlı state-changing endpoint'ler için CSRF/origin savunmasını netleştirin ve test edin.
3. Refresh-token rotation/reuse detection için eklenen row lock'ı eşzamanlı refresh integration testiyle kanıtlayın.
4. Controller authorization matrisini MockMvc/integration testlerle kanıtlayın ve servis boundary'sindeki yetki varsayımlarını açıkça güvenceye alın.
5. Reversal concurrency'sini ve DB invariant'larını doğrulayın; özellikle aynı movement'ın iki kez ters çevrilmesini engelleyin.

## Kapsam dışı / doğrulanamayan noktalar

- Gerçek production reverse proxy, TLS, secret manager, firewall/WAF ve PostgreSQL backup ayarları repository'de bulunmadığından doğrulanamadı.
- Rate limit'in altyapı katmanında (ör. ingress/API gateway) ayrıca uygulanıp uygulanmadığı bu repository'den doğrulanamadı.
- Dependency zafiyetlerinin güncel durumu OWASP workflow çıktısı olmadan bu statik incelemeyle belirlenemez.

## Geliştirme Önerileri

Aşağıdaki öneriler etki/efor oranına göre sıralanmıştır. Bunlar henüz uygulanmış değişiklikler değildir.

| # | Alan | Etki | Efor | Neden değerli | Mevcut kodu bozma riski |
|---|---|---|---:|---|---|
| 1 | Güvenlik sertleştirme | Yüksek | 6–10 saat | Production secret'larını zorunlu kılmak, cookie'lerde `Secure` desteği eklemek ve CSRF/origin politikasını test etmek, cookie tabanlı oturumların en kritik deployment risklerini azaltır. | Orta — deployment konfigürasyonu ve browser akışları etkilenebilir; geriye dönük olarak development profili korunmalı. |
| 2 | Refresh-token rotation ve reuse testleri | Yüksek | 6–8 saat | Atomik rotation, ikinci kullanım ve eşzamanlı refresh testleri token çalınması durumunda beklenen oturum iptalini gerçekten kanıtlar. | Orta — refresh endpoint'inin hata kodu ve cookie zamanlaması değişebilir; mevcut API şekli korunmalı. |
| 3 | HTTP authorization test matrisi | Yüksek | 8–12 saat | STAFF, WAREHOUSE_MANAGER ve ADMIN için 401/403/200/201 sonuçlarını MockMvc veya gerçek Spring context ile doğrulamak, rol kurallarının yalnızca konfigürasyon yorumlarında kalmasını önler. | Düşük — test-only değişiklik; testler mevcut davranıştaki tutarsızlıkları görünür kılabilir. |
| 4 | Reversal concurrency ve veritabanı invariant testleri | Yüksek | 6–10 saat | Aynı movement'ın iki kez ters çevrilmesini ve negatif/uygunsuz lot değerlerini gerçek PostgreSQL üzerinde sınamak, ledger bütünlüğünü korur. | Düşük — öncelikle test eklenir; başarısız test mevcut bir davranış riskini ortaya çıkarır. |
| 5 | Login rate limit ve hesap kilitleme | Yüksek | 8–16 saat | Brute-force saldırılarını sınırlamak ve başarısız girişleri izlemek, internete açık login endpoint'i için doğrudan güvenlik değeri sağlar. | Orta — meşru kullanıcıların tekrar deneme davranışı ve operasyonel kurtarma süreci etkilenir. |
| 6 | Audit güvenilirliği ve operasyonel görünürlük | Orta | 6–10 saat | Kritik audit kayıtlarını kaybolmayacak şekilde yazmak veya outbox/metric ile izlemek; async audit hatalarını Grafana alarmına dönüştürmek denetim kanıtının güvenilirliğini artırır. | Orta — işlem gecikmesi veya transaction davranışı değişebilir; kritik ve kritik olmayan olaylar ayrılmalı. |
| 7 | Operasyonel smoke test ve healthcheck akışı | Orta | 4–8 saat | Compose servislerinin gerçekten hazır olmasını beklemek, API healthcheck sonrası frontend/Prometheus bağlantısını doğrulamak ve image scan eklemek demo/CI başarısızlıklarını azaltır. | Düşük — uygulama koduna etkisi sınırlı; CI süresi artar. |
| 8 | Demo ve kullanıcı deneyimi senaryoları | Orta | 4–8 saat | FIFO giriş/çıkış/reversal, düşük stok ve rol farklarını gösteren deterministik demo verisi ile 401/403/409 hata mesajları, Almanya'daki mülakat ve Türk müşteri sunumlarında teknik değeri görünür kılar. | Düşük — mevcut endpoint sözleşmesi korunursa veri ve dokümantasyon ağırlıklıdır. |
