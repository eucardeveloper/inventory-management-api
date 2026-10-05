# ADR-007: Testcontainers with real PostgreSQL

**Status:** Accepted

## Context

The production persistence layer is PostgreSQL and the concurrency behavior depends on PostgreSQL row locks. An in-memory database would not provide sufficient confidence for `SELECT ... FOR UPDATE`, Flyway migrations, or PostgreSQL-specific schema behavior.

## Decision

Use Testcontainers with PostgreSQL 16 for the Spring context and concurrency integration tests. Tests are guarded by `DockerAvailableCondition`, so environments without a Docker daemon skip the container-dependent tests rather than pretending to have validated database behavior.

## Alternatives

- H2 would be faster but would not faithfully prove PostgreSQL locking behavior.
- A shared developer database would make tests environment-dependent and could mutate shared data.
- Repository mocks are retained for focused service unit tests, but are not used as a substitute for integration coverage.

## Consequences

CI requires a working container runtime for the integration job. The tests validate real migrations, transactions and PostgreSQL locks; when Docker is unavailable, the Maven build can still pass with those tests skipped, so the test summary must report skipped integration tests honestly. On Windows Docker Desktop, Surefire passes Docker API version `1.44` for compatibility with the bundled Testcontainers client; with Docker available the current suite runs with zero skipped tests.
