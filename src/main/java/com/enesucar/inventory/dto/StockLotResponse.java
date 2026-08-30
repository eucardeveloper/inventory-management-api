package com.enesucar.inventory.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A single FIFO layer as the product-detail screen displays it.
 *
 * <p>The UI renders one row per lot in receipt order, so the operator can see the queue the
 * next OUT movement will eat into:
 * <pre>
 *   Lot #1 | 20 units | EUR 40.00/unit | 12 Aug 2026 | remaining: 20
 *   Lot #2 | 30 units | EUR 42.50/unit | 19 Aug 2026 | remaining: 30
 * </pre>
 *
 * @param lotValue remainingQuantity x unitCost — this lot's contribution to inventory value
 * @param exhausted true when the lot is spent; kept visible because it is part of the audit trail
 */
public record StockLotResponse(
        Long id,
        int quantity,
        int remainingQuantity,
        BigDecimal unitCost,
        BigDecimal lotValue,
        LocalDateTime receivedAt,
        boolean exhausted
) {}
