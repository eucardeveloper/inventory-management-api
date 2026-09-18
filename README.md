# Warehouse Management System (WMS)

Spring Boot 3.5.4 + Next.js 16 tabanlı, JWT kimlik doğrulama, rol tabanlı erişim kontrolü (RBAC), Prometheus/Grafana izleme ve OWASP güvenlik taraması içeren tam kapsamlı depo yönetim sistemi.

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Backend | Java 21, Spring Boot 3.5.4, Spring Security, JWT |
| Frontend | Next.js 16.3.0 (Turbopack), TypeScript, Tailwind CSS |
| Veritabanı | PostgreSQL 16 |
| İzleme | Prometheus + Grafana |
| Konteynerleştirme | Docker + Docker Compose |
| CI/CD | GitHub Actions (CI pipeline + OWASP tarama) |

---

## Hızlı Başlangıç

### Gereksinimler
- Docker Desktop (Windows/Mac/Linux)
- Git

### Kurulum

```bash
git clone https://github.com/eucardeveloper/inventory-management-api.git
cd inventory-management-api
docker compose up --build
```

İlk başlatmada Docker imajları build edileceği için 3–5 dakika sürebilir.

> **Not:** Tüm servisler hazır olduğunda frontend otomatik olarak `http://localhost:3002` adresinde erişilebilir olur.

### Servis URL'leri

| Servis | URL |
|--------|-----|
| Frontend (WMS Uygulaması) | http://localhost:3002 |
| Backend API | http://localhost:8083 |
| Swagger UI | http://localhost:8083/swagger-ui.html |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

---

## Demo Kullanıcılar

| Kullanıcı adı | Şifre | Rol |
|--------------|-------|-----|
| `admin` | `admin123` | ADMIN |
| `warehouse` | `warehouse123` | WAREHOUSE_MANAGER |
| `staff` | `staff123` | STAFF |

---

## Özellikler

### Güvenlik
- **JWT + HttpOnly Cookie**: `access_token` ve `refresh_token` HttpOnly cookie olarak saklanır — JavaScript erişimi engellenir
- **Next.js Middleware**: URL'e doğrudan erişimde sunucu tarafında JWT doğrulama ve rol kontrolü
- **Refresh Token**: Access token süresi dolunca otomatik yenileme
- **RBAC**: 3 farklı rol ile sayfa/endpoint bazlı erişim kontrolü

### Rol Yetkileri

| Özellik | ADMIN | WAREHOUSE_MANAGER | STAFF |
|---------|-------|-------------------|-------|
| Dashboard | ✅ | ✅ | ✅ |
| Ürünler | ✅ | ✅ | ✅ |
| Hareketler | ✅ | ✅ | ✅ |
| Tedarikçiler | ✅ | ✅ | ❌ |
| Raporlar | ✅ | ✅ | ❌ |
| Denetim Günlüğü | ✅ | ❌ | ❌ |
| Kullanıcı Yönetimi | ✅ | ❌ | ❌ |

### URL Routing
Her sayfa kendi URL'inde çalışır:

| Sayfa | URL |
|-------|-----|
| Dashboard | `/dashboard` |
| Ürünler | `/products` |
| Hareketler | `/movements` |
| Tedarikçiler | `/suppliers` |
| Raporlar | `/reports` |
| Denetim | `/audit` |
| Kullanıcılar | `/users` |

Yetkisiz erişimde middleware `/dashboard` veya `/login`'e yönlendirir.

### Stok Takibi
- FIFO bazlı stok hesaplama
- Hareket başına `stock_after` kümülatif takibi
- Giriş/çıkış/iade hareket tipleri

### Raporlama & Dışa Aktarma
- PDF, Excel (XLSX), CSV formatlarında dışa aktarma
- Türkçe karakter desteği (UTF-8 BOM)
- FIFO maliyet raporu

### İzleme
- Prometheus: `/actuator/prometheus` endpoint
- Grafana: Önceden yapılandırılmış dashboard (http://localhost:3001, admin/admin)

---

## API Endpointleri (Özet)

```
POST   /api/auth/login          # Giriş (cookie set eder)
POST   /api/auth/logout         # Çıkış (cookie siler)
POST   /api/auth/refresh        # Token yenile

GET    /api/products            # Ürün listesi
POST   /api/products            # Ürün ekle (ADMIN/MANAGER)
PUT    /api/products/{id}       # Ürün güncelle (ADMIN/MANAGER)

GET    /api/movements           # Hareket listesi
POST   /api/movements           # Hareket ekle (ADMIN/MANAGER)

GET    /api/suppliers           # Tedarikçi listesi
POST   /api/suppliers           # Tedarikçi ekle (ADMIN/MANAGER)

GET    /api/reports/stock       # Stok raporu
GET    /api/reports/movements   # Hareket raporu

GET    /api/audit               # Denetim günlüğü (ADMIN)
GET    /api/users               # Kullanıcı listesi (ADMIN)
```

---

## Proje Yapısı

```
inventory-management-api/
├── src/                          # Spring Boot backend (Java 21)
│   └── main/java/com/enesucar/inventory/
│       ├── config/               # Security, JWT, CORS yapılandırması
│       ├── controller/           # REST controller'lar
│       ├── dto/                  # Request/Response DTO'ları
│       ├── entity/               # JPA entity'leri
│       ├── repository/           # Spring Data JPA repository'leri
│       └── service/              # İş mantığı servisleri
├── frontend/warehouse-app/       # Next.js 16 frontend
│   └── src/
│       ├── app/                  # App Router sayfaları
│       │   ├── page.tsx          # Ana uygulama (SPA)
│       │   ├── dashboard/        # /dashboard route
│       │   ├── products/         # /products route
│       │   ├── movements/        # /movements route
│       │   ├── suppliers/        # /suppliers route
│       │   ├── reports/          # /reports route
│       │   ├── audit/            # /audit route
│       │   ├── users/            # /users route
│       │   └── login/            # /login route
│       ├── middleware.ts          # JWT doğrulama + yetki kontrolü
│       ├── components/           # Paylaşılan UI bileşenleri
│       └── hooks/                # React Query hook'ları
├── monitoring/
│   ├── prometheus/               # Prometheus yapılandırması
│   └── grafana/                  # Dashboard provisioning
├── .github/workflows/
│   ├── ci.yml                    # Unit test → Integration test → Docker build
│   └── owasp.yml                 # Haftalık OWASP bağımlılık taraması
├── docker-compose.yml            # Tüm servisler
└── Dockerfile                    # Spring Boot multi-stage build
```

---

## CI/CD Pipeline

### CI (Her Push)
1. **Unit Tests** — JUnit 5, Spring slice testleri
2. **Integration Tests** — Testcontainers (gerçek PostgreSQL)
3. **Docker Build & Push** → `ghcr.io/eucardeveloper/warehouse-wms` (sadece main branch)

### OWASP Güvenlik Taraması (Haftalık / Manuel)
- Her Pazartesi 08:00 UTC otomatik çalışır
- `continue-on-error: true` — tarama başarısız olsa da pipeline devam eder
- Rapor HTML olarak Artifacts bölümüne yüklenir (14 gün saklanır)
- Manuel tetiklemek için: Actions → OWASP Weekly Scan → Run workflow

---

## Ortam Değişkenleri

Üretim ortamı için `.env` dosyası oluşturun:

```env
JWT_SECRET=guclu-ve-uzun-bir-secret-key-buraya-en-az-256-bit
GRAFANA_PASSWORD=guvenli-sifre
```

Docker Compose bu değişkenleri otomatik alır. Varsayılan değerler sadece yerel geliştirme içindir.

---

## Geliştirme Ortamı

Backend:
```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Frontend:
```bash
cd frontend/warehouse-app
npm install
npm run dev
```
