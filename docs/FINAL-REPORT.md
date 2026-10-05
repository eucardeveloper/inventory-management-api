# Final verification report

## Scope

This report records the verification performed on the
`agents/wms-documentation-enhancements` branch. It does not make a
production-ready claim; it records only repository and local Docker Desktop
evidence.

## Implemented hardening

- Testcontainers is configured for the bundled client through Surefire
  `api.version=1.44`; the PostgreSQL integration tests run on Windows Docker
  Desktop instead of being skipped.
- Controller authorization coverage uses MockMvc and the real Spring Security
  chain for ADMIN, WAREHOUSE_MANAGER, STAFF and anonymous requests.
- Refresh-token rotation uses an atomic active-token update. A concurrent
  reuse test accepts exactly one success and one rejection.
- Login protection uses configurable username/IP counters, a default five
  attempt threshold, a 60-second window and a 300-second HTTP 423 lock.
- State-changing requests with an `Origin` or `Referer` header are checked
  against `SECURITY_ALLOWED_ORIGINS`. A disallowed browser origin returns 403.
- AOP audit persistence is synchronous in the business transaction. Audit
  persistence failures are not silently swallowed.
- Frontend lint findings were fixed without disabling rules. Next.js was
  updated to 16.3.8 without `--force`.
- CI now runs frontend lint/build/audit, Testcontainers integration tests and
  Docker builds. OWASP Dependency Check no longer uses `continue-on-error` and
  keeps a reviewed suppression file with a CVSS 7 threshold.

## Backend test result

Command:

```text
./mvnw test
```

Result:

| Metric | Result |
|---|---:|
| Tests | 45 |
| Failures | 0 |
| Errors | 0 |
| Skipped | 0 |

The concurrency, authorization, refresh, login-rate-limit, Origin and
Testcontainers integration tests all executed in this run.

## Compose verification

Commands:

```text
docker compose down -v
docker compose up --build -d
```

Observed:

- PostgreSQL 16: healthy.
- Spring Boot backend: healthy on `http://localhost:8083`.
- Next.js frontend: HTTP 200 on `http://localhost:3002`.
- Prometheus readiness: HTTP 200 on `http://localhost:9090/-/ready`.
- Grafana health: HTTP 200 on `http://localhost:3001/api/health`.
- Flyway validated and applied 7 migrations on an empty database, ending at
  version `v7`. No V8 migration exists because no additional database schema
  change was required by the implemented hardening.

## Real HTTP smoke checks

Using the seeded `admin` account and an allowed origin:

- `/actuator/health`: `UP`.
- Admin login: successful, role `ADMIN`.
- Stock IN: HTTP 201, movement id `57`.
- Stock OUT: HTTP 201, movement id `58`.
- OUT reversal with the required `reasonCode`: HTTP 201, movement id `59`.
- Disallowed `Origin: https://evil.example` on login: HTTP 403.
- Six invalid logins from the same username/IP: `401, 401, 401, 401, 401, 423`.

## Frontend result

| Command | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run build` | Pass |
| `npm audit --audit-level=high` | Fails with 5 high findings |

The remaining npm findings are in the transitive
`eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch ->
braces` chain. npm offers only a breaking `npm audit fix --force` path for
this chain; `--force` was intentionally not used. The former Next.js critical
finding was removed by the non-breaking update to Next.js 16.3.8.

No frontend test runner was present in the repository, so login, redirect and
product-list automated frontend tests were not added in this pass. The
production build validates TypeScript compilation and route generation, not
browser interaction behavior.

## Remaining limitations

1. Login rate-limit state is process-local and does not coordinate across
   multiple backend instances. Behind a reverse proxy it uses
   `getRemoteAddr()`; trusted proxy IP handling is deployment-specific.
2. Origin/Referer checking is not a synchronizer-token implementation. Requests
   without either header remain compatible for non-browser clients.
3. `JWT_COOKIE_SECURE` and deployment secrets must be set explicitly outside
   local development. TLS, WAF, secret management, backups and network
   isolation are not proven by this repository.
4. The npm high findings above remain a CI audit blocker until an upstream
   non-breaking fix is available or a reviewed dependency strategy is chosen.
5. The Next.js `middleware` convention emits a deprecation warning during
   build; the build still succeeds.

## Commits produced

- `7db76f3`, `7be3ba6` — Windows Testcontainers compatibility
- `cfb5820` — authorization integration matrix
- `a64fb05` — atomic refresh rotation
- `061d991` — login rate limiting
- `4350d60` — Origin protection
- `c2ecda0` — transactionally reliable audit persistence
- `bad8f89` — frontend lint and dependency updates
- `6d0017a` — CI security and delivery gates
- `18b438f` — documentation alignment
