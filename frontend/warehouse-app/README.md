<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
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
>>>>>>> db5ec99415015f788111e6bedbccc3b4a1ed1920
