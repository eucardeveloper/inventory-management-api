package com.enesucar.inventory.dto;

import java.time.Instant;
import java.util.List;

/**
 * Result of the stock integrity check. A product is consistent when the cached stock, the sum of its open lots,
 * the net of the ledger and the last recorded stock-after all name the same number. Quantities only: no costs.
 */
public record StockIntegrityResponse(Instant checkedAt, int checkedProducts, int inconsistentProducts,
                                     List<Row> rows) {

    public record Row(Long productId, String articleNumber, String name, long stock, long lotTotal,
                      long ledgerNet, long lastStockAfter, boolean consistent) {
    }
}
