# Security

This is a portfolio project, not a production system. What it does, and what it does not, is stated here so nobody has to guess.

## Implemented
- Session in an HttpOnly, `SameSite=Strict` cookie; `Origin`/`Referer` check on writes; CORS allowlist; no Spring CSRF token by design (see [ADR-007](docs/adr/ADR-007-csrf-without-spring-tokens.md)).
- Roles ADMIN / INVENTORY_MANAGER / STAFF enforced on the server; creating accounts is ADMIN-only; unit costs are masked for STAFF.
- Login throttling per client address and per username (kept in memory, so it resets when the application restarts).
- The JWT secret has no default and must be supplied through the environment.
- Stock integrity by construction: append-only ledger with reversals, pessimistic row locks, idempotency keys for retries, and an integrity check API (`/api/stock/integrity`).
- Actuator on a separate management port; `/actuator/metrics` needs ADMIN.
- Flyway-only schema changes (`ddl-auto=validate`), non-root container, Dependabot, OWASP dependency check and CodeQL in CI.

## Not covered
- No penetration test or formal ASVS review. Do not read "implemented" as "certified".
- No refresh-token rotation: a stolen cookie works until it expires.
- STAFF can enter a unit cost on stock-in; this is a documented design limit, not an access control.
- A request with neither `Origin` nor `Referer` is treated as a non-browser client and passes the origin check (ADR-007).
- Demo credentials are public by design for the local demo.

## Reporting
Use GitHub's private vulnerability reporting ("Security" tab → "Report a vulnerability") if it is enabled, or open an issue without exploit details. There is no bounty and no guaranteed response time. Only the latest `main` is maintained.
