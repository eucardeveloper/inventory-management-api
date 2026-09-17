package com.enesucar.inventory.event;

/**
 * Published when a stock movement drives on-hand stock at or below the product's
 * configured {@code minimumStock} threshold.
 *
 * <p><b>Why a separate event instead of a flag on StockMovementRecordedEvent?</b>
 * The low-stock condition is a distinct business fact with distinct consumers: warehouse
 * managers want an alert, buyers may want to trigger a purchase order, the dashboard may
 * highlight the product in red. Embedding the condition on the movement event would mean
 * every consumer of that event must decide whether to check the flag — leaking the
 * low-stock concept into places that don't care about it. A separate event lets those
 * consumers subscribe to exactly what they need.
 *
 * <p>{@code threshold} is carried on the event so consumers don't need a second database
 * read to know what the limit was at the moment the alert fired.
 */
public record LowStockDetectedEvent(
        Long productId,
        String productName,
        String articleNumber,
        int currentStock,
        int threshold
) {}
