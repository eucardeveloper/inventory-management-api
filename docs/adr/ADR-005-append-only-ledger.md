# ADR-005: Append-Only Ledger for Stock Movements

**Status:** Accepted  
**Date:** 2026-01-01  
**Author:** Enes Uçar

## Context

Warehouse stock movements are financial records. Editing or deleting a movement row would break audit trail integrity and could hide operational errors.

## Decision

`stock_movement` rows are **never updated or deleted after creation**.

To correct an error, a `REVERSAL` movement is created that references the original via `reversal_of_id`. The reversal:
1. Restores the consumed `stock_lot` quantities to their exact pre-movement state (`restoreConsumedLots()`).
2. Updates the denormalized `product.stock` cache.
3. Cannot itself be reversed (enforced in `StockMovementService.reverseMovement()`).

Idempotency keys (`idempotency_key UNIQUE`) ensure the same client request never creates two movement rows even under network retries.

## Consequences

- The full history of every product's stock is always recoverable by replaying `stock_movement` in `occurred_at` order.
- Auditors and supervisors can see every action and its correction — nothing can be silently erased.
- COGS reconciliation across any date range is deterministic.
- Reversal is a supervisory action (`WAREHOUSE_MANAGER` or `ADMIN` role) — the person who booked a movement cannot quietly undo it (separation of duties).
