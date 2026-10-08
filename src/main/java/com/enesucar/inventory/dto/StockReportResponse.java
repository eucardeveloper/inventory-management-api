package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.Product;

import java.math.BigDecimal;

/**
 * Per-product stock summary returned by GET /api/warehouse/report.
 */
public record StockReportResponse(
        Long    productId,
        String  productName,
        String  articleNumber,
        long    totalIn,
        long    totalOut,
        int     currentStock,
        Integer reorderLevel,
        boolean isLowStock,
        /** FIFO value of the units on hand (remaining units x the cost of the lot they came from). Null when the caller may not see costs. */
        BigDecimal inventoryValue
) {
    public static StockReportResponse of(Product p, long totalIn, long totalOut, BigDecimal inventoryValue) {
        return new StockReportResponse(
                p.getId(),
                p.getName(),
                p.getArticleNumber(),
                totalIn,
                totalOut,
                p.getStock() != null ? p.getStock() : 0,
                p.getReorderLevel(),
                p.isLowStock(),
                inventoryValue
        );
    }

    public StockReportResponse withoutCost() {
        return new StockReportResponse(productId, productName, articleNumber, totalIn, totalOut,
                currentStock, reorderLevel, isLowStock, null);
    }
}
