package com.enesucar.inventory.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Body of {@code PUT /api/products/{id}}. Partial: a field that is absent (null) is left
 * unchanged, so the UI can send just {@code {"active": false}}.
 *
 * <p>{@code stock}, {@code id} and {@code version} cannot be set here (see
 * {@link CreateProductRequest}); they are ignored if present.
 */
public record UpdateProductRequest(
        @Size(min = 1, max = 255) String name,
        @Size(max = 100) String articleNumber,
        @Size(max = 2000) String description,
        @PositiveOrZero BigDecimal unitPrice,
        @PositiveOrZero Integer reorderLevel,
        Boolean active,
        SupplierRef supplier
) {}
