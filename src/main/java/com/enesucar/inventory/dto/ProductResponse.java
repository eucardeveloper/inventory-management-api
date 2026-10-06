package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.Product;

import java.math.BigDecimal;

/**
 * A product as the API returns it. The JSON shape is the one the frontend already consumes;
 * what changed is that the JPA entity no longer crosses the API boundary, so a change to
 * the table can no longer leak into (or be driven by) the public contract.
 *
 * @param stock    units on hand (denormalised sum of the lots, read-only for clients)
 * @param lowStock true when stock is at or below the reorder level
 */
public record ProductResponse(
        Long id,
        Long version,
        String articleNumber,
        String name,
        String description,
        BigDecimal unitPrice,
        Integer stock,
        Integer reorderLevel,
        Boolean active,
        SupplierResponse supplier,
        boolean lowStock
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(),
                p.getVersion(),
                p.getArticleNumber(),
                p.getName(),
                p.getDescription(),
                p.getUnitPrice(),
                p.getStock(),
                p.getReorderLevel(),
                p.getActive(),
                p.getSupplier() == null ? null : SupplierResponse.from(p.getSupplier()),
                p.isLowStock()
        );
    }
}
