package com.enesucar.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Body of {@code POST /api/products}.
 *
 * <p>There is deliberately no {@code stock} field: on-hand stock is the sum of the FIFO lots
 * and only changes through stock movements. If a client could set it here, the denormalised
 * cache could disagree with the lots, which are the source of truth. A new product starts at 0.
 * Fields such as {@code id}, {@code version} or {@code stock} in the JSON are ignored.
 */
public record CreateProductRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 100) String articleNumber,
        @Size(max = 2000) String description,
        @PositiveOrZero BigDecimal unitPrice,
        @PositiveOrZero Integer reorderLevel,
        Boolean active,
        SupplierRef supplier
) {}
