# ADR-001: Modular Monolith over Microservices

**Status:** Accepted  
**Date:** 2026-01-01  
**Author:** Enes Uçar

## Context

The Inventory WMS must be deployable by a small team on a single server. At the same time, the codebase should be structured so it *could* be split into services if load demands it. The team has microservice experience (two prior projects) and is aware of the operational overhead that distributed systems introduce.

## Decision

Build a **modular monolith**: a single deployable JAR with strict package-level boundaries enforced by ArchUnit, not by network calls.

Modules:
- `controller` — HTTP interface (no business logic)
- `service` — all business rules (FIFO, idempotency, reversals)
- `repository` — data access only (JPA + Spring Data)
- `entity` — JPA-mapped domain objects
- `dto` — wire types (request/response records)
- `security` — authentication and authorisation filters
- `filter` — cross-cutting request concerns (trace ID)

## Alternatives Rejected

| Alternative | Why rejected |
|---|---|
| Microservices from day one | Distributed transactions (inventory + product + supplier) require saga/2PC. Adds weeks of operational complexity (service discovery, inter-service auth, distributed tracing) before any business value is delivered. |
| Serverless functions | Cold-start latency unacceptable for synchronous warehouse operations. No persistent DB connection pooling. |

## Consequences

- **Good:** single `docker-compose up` to run everything; no inter-service latency; ACID transactions across all domain objects.
- **Good:** ArchUnit tests enforce boundaries at CI time — a PR that calls a repository from a controller fails the build.
- **Acceptable:** vertical scaling only until extraction — but this is appropriate for the current load profile.
- **Migration path:** each module's `service` + `repository` + `entity` cluster is already self-contained. Extracting, e.g., the `supplier` domain into its own service requires only adding a Feign/HTTP client and a Kafka event bus for eventual consistency — no business logic changes.
