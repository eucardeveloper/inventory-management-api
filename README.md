# Inventory Management API

A warehouse inventory system with **FIFO cost accounting**, an **append-only stock ledger**,
and **pessimistic concurrency control**.

Built with Spring Boot 3 / Java 21 / PostgreSQL 16. Frontend in React 19 + TypeScript.

---

## What makes this more than CRUD

Most inventory demos keep a single `stock` integer per product and add or subtract from it.
That works until the same product is bought at two different prices, at which point the system
can no longer answer the only two questions that matter to a business: *what is this inventory
worth*, and *what did the goods I just sold actually cost me*. This project answers both.

| Concern | How it is handled |
|---|---|
| Valuation | FIFO lots — every receipt opens a batch with its own acquisition cost |
| Cost of goods sold | Computed per movement from the lots actually consumed, itemised in the response |
| Correctness under load | `PESSIMISTIC_WRITE` on the lot queue, verified against real PostgreSQL |
| Auditability | Append-only ledger; corrections are reversals, never edits |
| Retry safety | Idempotency key with a database-level unique constraint |

---

## FIFO: the mechanism

**The problem.** A warehouse receives the same product at different prices over time:

```
12 Aug   IN   20 units @ EUR 40.00     -> Lot #1
19 Aug   IN   30 units @ EUR 42.50     -> Lot #2
```

There are now 50 units on the shelf, but "50 units" has no single cost. If 35 units are shipped,
what did they cost? Multiplying 35 by either price gives the wrong answer.

**The rule.** FIFO — first in, first out — says the oldest stock leaves first. So the 35 units
come out of Lot #1 until it is empty, then out of Lot #2:

```
OUT  35 units
  ├─ 20 from Lot #1 @ EUR 40.00  =  EUR   800.00   (Lot #1 now exhausted)
  └─ 15 from Lot #2 @ EUR 42.50  =  EUR   637.50   (Lot #2 has 15 left)
                                    ─────────────
                       COGS         EUR 1,437.50
```

The API returns that breakdown rather than only the total, so the UI can show the arithmetic and
an auditor can reproduce it:

```jsonc
POST /api/warehouse/movements
{ "productId": 1, "quantity": 35, "movementType": "OUT" }

201 Created
{
  "id": 812,
  "movementType": "OUT",
  "quantity": 35,
  "totalCost": 1437.50,          // cost of goods sold
  "stockAfter": 15,
  "lotConsumptions": [
    { "lotId": 1, "quantityTaken": 20, "unitCost": 40.00, "lineCost": 800.00, "remainingAfter": 0  },
    { "lotId": 2, "quantityTaken": 15, "unitCost": 42.50, "lineCost": 637.50, "remainingAfter": 15 }
  ]
}
```

**Why lots and not an average cost.** Weighted-average costing is simpler and is legal in many
jurisdictions, but it destroys the link between a shipment and its cost: once averaged, you can
no longer say which delivery a sold unit came from. FIFO keeps that link, which is what makes
the valuation defensible in an audit — and under German commercial law (HGB §256) FIFO is an
explicitly permitted method, while a moving average requires more justification.

Implementation: [`FifoInventoryService`](src/main/java/com/enesucar/inventory/service/FifoInventoryService.java)
holds the arithmetic; [`StockLot`](src/main/java/com/enesucar/inventory/entity/StockLot.java) is
the batch.

---

## Concurrency: why `PESSIMISTIC_WRITE`

Booking an outbound movement is a read-modify-write. Two operators booking against the same SKU
at the same moment both read `remainingQuantity = 20`, both subtract 15, and the second write
overwrites the first. Thirty units left the building; the system believes fifteen did. Nothing
throws, nothing is logged — the error surfaces weeks later at a stock count.

The fix is to serialise access to the product's lots:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)          // -> SELECT ... FOR UPDATE
@Query("SELECT l FROM StockLot l WHERE l.product.id = :productId AND l.remainingQuantity > 0 ORDER BY l.receivedAt ASC")
List<StockLot> findOpenLotsForUpdate(@Param("productId") Long productId);
```

**Why not optimistic locking (`@Version` + retry)?** Optimistic locking is the better default
when conflicts are rare, because it costs nothing in the common case. It is the wrong fit here
for two reasons:

1. **Contention is expected, not rare.** Several operators book movements against the same
   fast-moving SKU simultaneously, so retries would be frequent rather than exceptional.
2. **A FIFO consumption spans an unknown number of rows.** An optimistic failure surfaces after
   the work is done and forces a retry that may consume a *different set of lots* the second
   time. Taking the lock up front keeps the calculation deterministic.

**The trade-off, stated honestly:** movements on the same product queue up. Movements on
different products are unaffected, because the lock is scoped by `product_id`. For a warehouse
this is the right exchange — a few milliseconds of waiting in return for a ledger that is never
wrong.

This is verified, not asserted:
[`ConcurrentStockMovementTest`](src/test/java/com/enesucar/inventory/integration/ConcurrentStockMovementTest.java)
fires ten simultaneous withdrawals against a real PostgreSQL container and asserts that units
withdrawn plus units remaining equals units received. Without the lock, that assertion fails.

---

## The append-only ledger

`stock_movement` rows are **never updated and never deleted.** Every cost column is mapped
`updatable = false`, so Hibernate physically cannot emit an UPDATE for them.

**Why.** Stock movements determine valuation, COGS and what the warehouse believes it holds. If
a row can be edited, last month's closing figure can change retroactively and no report is
reproducible. If a row can be deleted, the history has a hole exactly where someone had a reason
to make one. Accounting systems, banking cores and event stores all solve this the same way:
entries are facts, and facts are only ever added.

**Corrections are reversals.** A mistake is fixed by appending an opposite entry that points
back at the original and carries a reason code:

```
#812  OUT  35 units   COGS 1,437.50           reversed_by -> #813
#813  IN   35 units   reversal_of -> #812     reason: WRONG_QUANTITY
```

Both entries stay visible, and the relationship between them is explicit. An auditor can see
that a mistake happened *and* how it was handled — which is more trustworthy than a table in
which mistakes never appear to have happened.

Reversing an OUT returns the units **to the exact lots they came from**, not to a new lot at
today's cost. Anything else would put the returned stock at the back of the FIFO queue and change
the product's valuation, so the "correction" would leave a different financial position than the
one before the error. This is why
[`MovementLotConsumption`](src/main/java/com/enesucar/inventory/entity/MovementLotConsumption.java)
persists each FIFO line: the consumed lots cannot be recomputed later, because subsequent
movements have already changed the lot state.

A related consequence: **products are deactivated, never deleted.** An earlier version deleted a
product's entire movement history so the foreign keys would not complain — the opposite of what
a ledger is for.

---

## Idempotency

A warehouse operator double-clicks *Confirm*. A mobile client times out and retries. Without
protection each arrival books a separate movement and stock is decremented twice for one
physical event — and, unlike most duplicate-submission bugs, nothing errors. The numbers simply
drift.

Clients may send an `idempotencyKey`; a repeat returns the original movement instead of booking
a second.

**The constraint lives in the database, not in Java.** Checking "does a movement with this key
exist?" before inserting is a race — two concurrent requests both check, both find nothing, both
insert. Only a `UNIQUE` constraint can arbitrate, because only the database sees both writes.
The service therefore attempts the insert and treats the resulting
`DataIntegrityViolationException` as *already processed*. Letting the write fail is the correct
pattern; trying to predict that it will fail is not.

---

## Why monolith, not microservices

This is a deliberate choice, and the right one at this scale.

Products, lots and movements form **one transactional boundary**. Booking a movement writes to
all three tables and must be atomic — if the ledger row is written and the lot update fails, the
system records stock leaving that never left. In a monolith that guarantee costs one
`@Transactional` annotation. Split across services it requires a saga, compensating
transactions, an outbox and idempotent consumers: substantially more machinery, more failure
modes, and a window in which the data is knowingly inconsistent.

Microservices earn their cost when parts of a system need **independent scaling or independent
deployment**. Nothing here does. Adding Kafka would demonstrate familiarity with a tool while
demonstrating poor judgement about when to use it.

> Related project: [customer-management](https://github.com/eucardeveloper/customer-management)
> *does* use microservices and Kafka, because its services genuinely scale independently. The
> useful skill is not knowing one pattern — it is knowing which one a problem calls for.

---

## Roles

| Role | Read | Book movement | Reverse | Manage master data |
|---|:--:|:--:|:--:|:--:|
| `STAFF` | yes | yes | — | — |
| `WAREHOUSE_MANAGER` | yes | yes | yes | yes |
| `ADMIN` | yes | yes | yes | yes |

`STAFF` can book a movement but cannot reverse one. Separating *can record* from *can undo* is
what gives the audit trail its meaning: the person who made an entry cannot quietly erase it.

Enforced twice — coarse URL rules in `SecurityConfig`, and `@PreAuthorize` on the controllers,
which is the enforceable layer since it survives any future routing change.

---

## Running it

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| API | http://localhost:8083 |
| Swagger UI | http://localhost:8083/swagger-ui/index.html |
| Frontend | http://localhost:3002 |
| PostgreSQL | localhost:5436 |

### Demo credentials (seeded automatically)

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `warehouse` | `warehouse123` | WAREHOUSE_MANAGER |
| `staff` | `staff123` | STAFF |

Demo products and stock movements are also seeded on first startup via `V2__seed_demo_data.sql`.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `JWT_SECRET` | HS256 signing key — **must** be set in any deployed environment | dev-only fallback |
| `SPRING_DATASOURCE_URL` | Database URL | `jdbc:postgresql://inventory-db:5432/inventory_db` |
| `SPRING_DATASOURCE_USERNAME` / `_PASSWORD` | Database credentials | `postgres` / `postgres123` |
| `NEXT_PUBLIC_API_URL` | API origin, baked into the frontend at **build** time | `http://localhost:8083` |

### Tests

```bash
./mvnw verify
```

The concurrency suite requires Docker — Testcontainers starts a real `postgres:16-alpine`.
H2 does not reproduce PostgreSQL's row-level `SELECT ... FOR UPDATE` blocking, so a lock test on
H2 would pass while production still lost updates.


### Deploying to Railway

1. Create a new project on [Railway](https://railway.app) and add a **PostgreSQL** service.
2. Add a new service from this repository (GitHub).
3. Set the following environment variables in Railway:
   - `JWT_SECRET` — a secure random string (min 32 chars)
   - `SPRING_DATASOURCE_URL` — copied from Railway PostgreSQL → Connect tab (use the internal URL)
   - `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` — from Railway PostgreSQL credentials
   - `PORT` — Railway sets this automatically; `server.port=${PORT:8083}` picks it up
4. Railway builds using the `Dockerfile`. Flyway migrations run on startup; no manual DDL needed.

---
## API

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/products` | any | All products |
| `GET` | `/api/products/low-stock` | any | At or below reorder level, most urgent first |
| `GET` | `/api/products/{id}/lots` | any | FIFO layers of a product |
| `GET` | `/api/products/{id}/valuation` | any | FIFO valuation of a product |
| `GET` | `/api/products/valuation/total` | any | Total warehouse valuation |
| `POST` | `/api/warehouse/movements` | STAFF+ | Book a movement (IN opens a lot, OUT consumes FIFO) |
| `POST` | `/api/warehouse/movements/{id}/reverse` | MANAGER+ | Append a reversal |
| `GET` | `/api/warehouse/movements` | any | Ledger, paginated and filterable |

Errors follow **RFC 7807** (`application/problem+json`):

```jsonc
409 Conflict
{
  "type": "https://api.inventory.local/problems/insufficient-stock",
  "title": "Insufficient Stock",
  "detail": "Insufficient stock for 'Keyboard KB-102': requested 40, available 25",
  "requested": 40,
  "available": 25
}
```

---

## Known limitations

Stated deliberately — a portfolio project that claims to be finished is less credible than one
that knows its own edges.

- **Flyway migrations** manage the schema (`V1__init_schema.sql`). `ddl-auto=validate` ensures
  the DB matches entities on startup; Flyway applies any pending scripts automatically.
- **Reversal of a partially-consumed IN lot** restores by consuming FIFO rather than by
  unwinding the specific lot, which can select different lots than the original receipt if stock
  has moved since.
- **No rate limiting** on the auth endpoint.
- **Frontend is Next.js + MUI**, not the Vite + shadcn/ui stack originally planned. Migrating is
  queued behind the backend work.
