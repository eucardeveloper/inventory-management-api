package com.enesucar.inventory.dto;

import java.time.Instant;
import java.util.List;

/**
 * Result of the stock integrity check. A product is consistent when the cached stock, the sum of its open lots,
 * the net of the ledger and the last recorded stock-after all name the same number, and every OUT movement is
 * explained by consumption lines that add up to its quantity ({@code consumptionMismatches} counts the ones that
 * are not). Quantities only: no costs, so the endpoint cannot leak cost figures to its roles.
 */
public record StockIntegrityResponse(Instant checkedAt, int checkedProducts, int inconsistentProducts,
                                     List<Row> rows) {

    public record Row(Long productId, String articleNumber, String name, long stock, long lotTotal,
                      long ledgerNet, long lastStockAfter, long consumptionMismatches, boolean consistent) {
    }
}
