package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.Product;

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
        boolean isLowStock
) {
    public static StockReportResponse of(Product p, long totalIn, long totalOut) {
        return new StockReportResponse(
                p.getId(),
                p.getName(),
                p.getArticleNumber(),
                totalIn,
                totalOut,
                p.getStock() != null ? p.getStock() : 0,
                p.getReorderLevel(),
                p.isLowStock()
        );
    }
}
