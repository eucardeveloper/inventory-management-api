# ADR-006: Authorization model

**Status:** accepted

## Context
The API is reachable by anyone on the network, so every route needs an explicit rule, and a stolen or stale token must not keep working.

## Decision
- Anonymous requests to protected routes answer **401** (`HttpStatusEntryPoint`); a valid user without the role gets **403**.
- `POST /api/auth/register` requires **ADMIN**. Self-registration would let anyone create an ADMIN account.
- Registration validates input (username 3–50, password 8–100, role required) and answers 409 on duplicates; it never issues cookies.
- The audit log is ADMIN-only (`@PreAuthorize`).
- `JwtFilter` checks that the token's user still exists, so a token for a deleted user is rejected.
- `ApiAuthorizationTest` (Testcontainers, real Flyway) covers: anonymous 401 on all protected routes, forged token, STAFF 403, self-registration as ADMIN, deleted-user token.

## Consequences
One extra user lookup per authenticated request (cheap, indexed). New users are created by an admin, not by sign-up.
