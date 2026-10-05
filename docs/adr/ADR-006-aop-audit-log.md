# ADR-006: AOP audit logging

**Status:** Accepted

## Context

Successful product, supplier, user and stock operations need a central audit record without duplicating the same logging code in every service method. The repository already marks operations with `@Auditable` and keeps audit persistence in `AuditLogService`.

## Decision

Use Spring AOP with `@AfterReturning` advice for methods annotated with `@Auditable`. Resolve the caller and request IP in the request thread, then persist through `AuditLogService.record` in the surrounding transaction. A persistence failure is propagated so the business transaction can roll back rather than silently committing an operation without its audit record.

## Alternatives

- Repeating audit calls in every controller or service would be easy to miss when a new operation is added.
- JPA entity listeners would not naturally capture the authenticated caller, HTTP operation description, or result entity ID.
- Database triggers would capture direct writes but not the application actor and operation semantics in the same way.

## Consequences

The cross-cutting concern is centralized and successful operations are distinguished from failed operations. Audit writes add database work to the request and can make an operation fail when audit persistence is unavailable; this is intentional for audit-critical operations. A durable outbox remains an option if audit delivery must be decoupled from the request transaction.
