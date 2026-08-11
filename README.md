# Lagerverwaltung API (Warehouse Management System)

A RESTful backend system for managing warehouse products, suppliers, and stock movements.

## Technologies

- Java 21
- Spring Boot 3.3.5
- Spring Security + JWT
- PostgreSQL
- Docker + Docker Compose
- JUnit 5 + Mockito
- Swagger / OpenAPI

## Features

- Product, supplier and stock movement management
- JWT-based authentication (Register / Login)
- Role-based access control (LAGERLEITER / MITARBEITER)
- Unit tests for all service layers
- Fully dockerized

## Getting Started with Docker

### Requirements
- Docker Desktop installed and running

### Start the application

```bash
docker-compose up
```

Application runs at `http://localhost:8080`

### Swagger UI
http://localhost:8080/swagger-ui/index.html

## Authentication

### Register
```json
POST /api/auth/registrieren
{
  "benutzername": "enes",
  "passwort": "123456",
  "rolle": "LAGERLEITER"
}
```

### Login
```json
POST /api/auth/anmelden
{
  "benutzername": "enes",
  "passwort": "123456"
}
```

Enter the token in Swagger under **Authorize**.

## Roles

| Role | Permission |
|------|-----------|
| LAGERLEITER | Full access (GET, POST, PUT, DELETE) |
| MITARBEITER | Read only (GET) |

## Local Development

```properties
spring.datasource.url=jdbc:postgresql://localhost:5433/lagerverwaltung
spring.datasource.username=postgres
spring.datasource.password=postgres123
```

## Author

Enes Uçar — [github.com/eucardeveloper](https://github.com/eucardeveloper)