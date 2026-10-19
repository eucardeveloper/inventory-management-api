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
- An opaque refresh token is stored in a separate `HttpOnly; Path=/api/auth` cookie.
- Each call to `POST /api/auth/refresh` rotates the token (old revoked, new issued). Without a refresh cookie it answers `204` (nobody is signed in; the web app asks on every page load, and a 4xx would show up as a console error); an invalid, expired or reused token answers `401`.
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

## Amendment: session lifetime (2026-10-19)

The first version kept people signed in for days (24 h access token, 7-day refresh cookie): a browser reopened two days later was still signed in as the administrator, which is wrong for an admin tool that may be shown on someone else's screen. Now:
- The access token lives **15 minutes** (`jwt.access-token.expiry-minutes`).
- Both cookies are **session cookies** (no `Max-Age`), so closing the browser signs the user out.
- A refresh token is valid for **8 hours without use** (`jwt.refresh-token.expiry-hours`); every refresh issues a new one, so an active session continues and an idle one ends.
- The web app renews the access token once when a request answers `401` and repeats the request. Refresh tokens are single use, so parallel requests share one refresh call (and other tabs wait for it with the Web Locks API); a second parallel call would look like token theft and end every session.
- Trade-off: one extra round trip every 15 minutes of activity, and a person idle for 8 hours or longer signs in again.
