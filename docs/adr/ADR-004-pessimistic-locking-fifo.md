# ADR-004: Pessimistic Locking for FIFO Stock Consumption

**Status:** Accepted  
**Date:** 2026-01-01  
**Author:** Enes Uçar

## Context

Two warehouse operators may book an OUT movement for the same product simultaneously. Without coordination, both transactions may read the same lot as having sufficient quantity and both attempt to consume it, resulting in negative stock or corrupted lot data.

## Decision

Use **PostgreSQL `SELECT … FOR UPDATE`** (pessimistic write lock) on `stock_lot` rows during FIFO consumption.

`StockLotRepository.findOpenLotsForUpdate(@Param("productId") Long productId)` acquires row-level locks on all open lots for the product. The second concurrent transaction blocks at this statement until the first commits or rolls back.

## Why Pessimistic (not Optimistic)

- Stock movements are a **high-contention, low-read path**: the same product is frequently moved in bursts (receiving a shipment triggers multiple concurrent bookings).
- Optimistic locking (`@Version`) would cause the second transaction to throw `OptimisticLockException` and require a client-side retry — adding complexity and load spikes.
- The `SELECT … FOR UPDATE` block time is microseconds for a single product; throughput impact is negligible at warehouse scale.

`@Version` optimistic locking **is** appropriate on `Product` for the low-contention master-data update path (price changes, description edits) — those are separate, infrequent writes.

## Consequences

- Concurrent OUT movements on the same product are serialized; no negative stock is possible without a race.
- The test suite uses Testcontainers (real PostgreSQL) because H2 does not faithfully emulate `SELECT … FOR UPDATE` row-level blocking.
