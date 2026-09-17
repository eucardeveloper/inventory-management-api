# 📦 Inventory Management System (WMS)

A full-stack **Warehouse Management System** built with Spring Boot 3, Next.js 14, PostgreSQL and Docker — featuring FIFO inventory costing, role-based access control, audit logging, and real-time monitoring with Prometheus + Grafana.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Compose                       │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │  Next.js 14  │───▶│ Spring Boot 3│                  │
│  │  Port: 3002  │    │  Port: 8083  │                  │
│  └──────────────┘    └──────┬───────┘                  │
│                             │                           │
│                      ┌──────▼───────┐                  │
│                      │  PostgreSQL  │                   │
│                      │  Port: 5436  │                   │
│                      └──────────────┘                   │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │   Grafana    │◀───│  Prometheus  │                  │
│  │  Port: 3001  │    │  Port: 9090  │                  │
│  └──────────────┘    └──────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start — One Command Setup

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / Mac / Linux)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/inventory-management-api.git
cd inventory-management-api
```

### 2. Start everything
```bash
docker compose up -d
```

That's it. Docker will:
- Build the Spring Boot backend from source
- Build the Next.js frontend from source
- Start PostgreSQL and run migrations automatically
- Start Prometheus and Grafana with pre-wired dashboards

> First run takes ~3–5 minutes while images build. Subsequent starts are instant.

### 3. Open the app

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend (WMS App)** | http://localhost:3002 | See login table below |
| **Backend API** | http://localhost:8083 | — |
| **Grafana Monitoring** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | — |

---

## 🔐 Default Login Accounts

| Role | Username | Password | Access |
|------|----------|----------|--------|
| **Admin** | `admin` | `admin123` | Everything — products, suppliers, movements, reports, audit log |
| **Warehouse Manager** | `manager` | `manager123` | Products, suppliers, movements, reports (no audit log) |
| **Staff** | `staff` | `staff123` | Products and movements only (no financials) |

---

## ✨ Features

### Core Functionality
- **FIFO Inventory Costing** — accurate cost calculation using First-In-First-Out
- **Stock Movements** — record IN/OUT with quantity, cost and reason
- **Movement Reversal** — undo any stock movement with mandatory reason code and full audit trail
- **Low Stock Alerts** — automatic warning when stock falls below reorder level
- **Supplier Management** — link products to suppliers, track product counts

### Security & Access Control
- **JWT Authentication** via HttpOnly cookies (XSS-resistant)
- **Role-Based Access Control (RBAC)** — 3 roles with fine-grained permissions
- **Audit Log** — every create / update / delete action is logged with user, IP and timestamp

### Dashboard & Analytics
- Real-time stock movement trend chart (last 30 days)
- IN/OUT donut chart with totals
- Stock health pie chart (normal vs. low stock)
- FIFO total value calculation

### Monitoring
- **Prometheus** scrapes `/actuator/prometheus` every 10 seconds
- **Grafana** dashboard pre-provisioned — opens ready to use

### UX
- 🌙 Dark / Light theme toggle
- 🌍 Multi-language: Turkish, English, German
- Collapsible sidebar with icon-only mode
- Responsive layout

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Material UI (MUI) |
| Backend | Spring Boot 3.3, Spring Security, Spring Data JPA |
| Auth | JWT (HttpOnly Cookie) |
| Database | PostgreSQL 16 |
| Monitoring | Prometheus 2.53, Grafana 11.1 |
| Container | Docker, Docker Compose |

---

## 🗂️ Project Structure

```
inventory-management-api/
├── src/                        # Spring Boot backend source
│   └── main/java/
│       ├── controller/         # REST API endpoints
│       ├── service/            # Business logic & FIFO engine
│       ├── repository/         # JPA repositories
│       ├── model/              # JPA entities
│       └── security/           # JWT + Spring Security config
├── frontend/
│   └── warehouse-app/
│       └── src/app/
│           ├── page.tsx        # Main single-page application
│           └── layout.tsx
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml      # Scrape config
│   └── grafana/
│       ├── provisioning/       # Auto-wired datasource
│       └── dashboards/         # Pre-built WMS dashboard
├── docker-compose.yml          # Full stack orchestration
├── Dockerfile                  # Backend container build
└── seed.sql                    # Sample data (auto-loaded)
```

---

## ⚙️ Environment Variables

All defaults work out of the box. For production, override these in a `.env` file (never commit it):

```env
JWT_SECRET=your-256-bit-secret-key-here
GRAFANA_PASSWORD=your-grafana-password
```

---

## 🛑 Stop / Reset

```bash
# Stop all containers (data preserved)
docker compose down

# Stop and delete all data (fresh start)
docker compose down -v
```

---

## 🔌 API Endpoints (key ones)

```
POST   /api/auth/login              Login
POST   /api/auth/logout             Logout
GET    /api/products                List products
POST   /api/products                Create product
PUT    /api/products/{id}           Update product
DELETE /api/products/{id}           Delete product
GET    /api/stock-movements         List movements
POST   /api/stock-movements         Record movement
POST   /api/stock-movements/{id}/reverse  Reverse movement
GET    /api/suppliers               List suppliers
GET    /api/stock-report            FIFO stock report
GET    /api/audit-log               Audit log (Admin only)
GET    /actuator/health             Health check
GET    /actuator/prometheus         Prometheus metrics
```

---

## 📐 Architecture Decisions

See [`docs/adr/`](docs/adr/) for Architecture Decision Records covering:
- Monolith vs microservices choice
- FIFO inventory engine design
- HttpOnly Cookie JWT approach
- Pessimistic locking for concurrent stock updates
- Append-only audit ledger

---

## 🧪 Running Tests

```bash
# Backend unit + integration tests (requires Docker for Testcontainers)
./mvnw test

# Or skip Testcontainers tests without Docker
./mvnw test -Dskip.testcontainers=true
```
