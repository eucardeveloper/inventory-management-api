# ADR-003: HttpOnly Cookie JWT Storage

**Status:** Accepted  
**Date:** 2026-09-06  
**Author:** Enes Uçar

## Context

The original implementation stored the JWT access token in `localStorage`. This exposes the token to any JavaScript executing on the page — including injected scripts from XSS attacks — making session hijacking trivial.

All four reviewed external analyses (Gemini, DeepSeek, ChatGPT, Claude) flagged this as the highest-priority security gap.

## Decision

Store the JWT in an **HttpOnly cookie** set by the server on login. The browser automatically sends the cookie with every request; JavaScript cannot read it.

Additionally introduce **refresh token rotation**:
- A long-lived (7-day) opaque refresh token is stored in a separate `HttpOnly; Path=/api/auth` cookie.
- Each call to `POST /api/auth/refresh` rotates the token (old revoked, new issued).
- Reuse of a revoked refresh token triggers revocation of **all** tokens for that user (token theft detection).
- Refresh token values are BCrypt-hashed before storage — a DB dump cannot replay sessions.

## Alternatives Rejected

| Alternative | Why rejected |
|---|---|
| `localStorage` | XSS-readable; industry standard is moving away from this. |
| `sessionStorage` | Same XSS exposure as localStorage; also lost on tab close. |
| Token in memory only | Lost on page refresh; requires silent re-authentication flow on every load — equivalent complexity but without the security properties of HttpOnly. |

## Consequences

- CORS must set `allowCredentials = true` and list specific origins (not `*`).
- Frontend fetch calls must include `credentials: 'include'`.
- Swagger UI / curl still works via the `Authorization: Bearer` fallback in `JwtFilter`.
- The `refresh_token` table requires a Flyway migration (V3).
