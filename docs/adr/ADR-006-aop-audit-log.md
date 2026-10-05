# ADR-006: AOP audit logging

**Status:** Accepted

## Context

Successful product, supplier, user and stock operations need a central audit record without duplicating the same logging code in every service method. The repository already marks operations with `@Auditable` and keeps audit persistence in `AuditLogService`.

## Decision

Use Spring AOP with `@AfterReturning` advice for methods annotated with `@Auditable`. Resolve the caller and request IP in the request thread, then delegate persistence to the audit service. The current implementation writes these records asynchronously in a separate transaction so an audit write does not fail the business response.

## Alternatives

- Repeating audit calls in every controller or service would be easy to miss when a new operation is added.
- JPA entity listeners would not naturally capture the authenticated caller, HTTP operation description, or result entity ID.
- Database triggers would capture direct writes but not the application actor and operation semantics in the same way.

## Consequences

The cross-cutting concern is centralized and successful operations are distinguished from failed operations. The trade-off is that asynchronous persistence can lose an audit record if the write fails; this is a documented operational limitation and should be monitored or replaced with an outbox for stronger guarantees.
