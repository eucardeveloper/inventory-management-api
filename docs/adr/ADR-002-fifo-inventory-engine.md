# ADR-002: FIFO Inventory Valuation Engine

**Status:** Accepted  
**Date:** 2026-01-01  
**Author:** Enes Uçar

## Context

Stock valuation requires a consistent costing method for accurate financial reporting. The three common methods are FIFO (first-in, first-out), LIFO (last-in, first-out), and Weighted Average Cost (WAC).

## Decision

Implement **FIFO** using an explicit `stock_lot` table.

Each `IN` movement creates a `StockLot` row with the received quantity and unit cost. Each `OUT` movement consumes lots in `received_at ASC` order (oldest first), recording every partial consumption in `movement_lot_consumption`. The COGS of any OUT movement is the sum of its `movement_lot_consumption` rows.

## Why FIFO

- Most common method in EU/US accounting standards (IAS 2 permits FIFO and WAC; LIFO is forbidden under IFRS).
- Matches physical goods flow in most warehouse operations.
- Enables **true reversal**: `restoreConsumedLots()` returns the exact quantities consumed back to their original lots rather than re-creating a new lot.

## Pessimistic Locking

`StockLotRepository.findOpenLotsForUpdate()` uses `SELECT … FOR UPDATE` to serialize concurrent OUT movements on the same product. This prevents double-consumption of the same lot under parallel requests. See ADR-004.

## Consequences

- `stock_lot` and `movement_lot_consumption` are append-only; never updated except to decrement `remaining_quantity` on a lot.
- COGS calculation is O(lots consumed), not O(all movements for a product).
- Stock accuracy survives concurrent requests without optimistic-lock retries.
