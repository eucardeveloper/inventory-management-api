package com.enesucar.inventory.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Body of {@code PUT /api/products/{id}}. Partial: a field that is absent (null) is left
 * unchanged, so the UI can send just {@code {"active": false}}.
 * The supplier can also be removed: {@code {"supplier": {"id": null}}}, and so can the list price:
 * {@code {"clearUnitPrice": true}}. (A flag, not a null: JSON cannot tell a missing field from an explicit null
 * reliably across mappers, and a silent mix-up would wipe prices. {@code unitPrice: null} still means unchanged.)
 * Combining {@code clearUnitPrice} with a {@code unitPrice} value is a 400.
 *
 * <p>{@code version} is an optional precondition (optimistic locking): the version of the product
 * the client last read. If it differs from the stored one the update is refused with 409, so two
 * people editing the same product cannot silently overwrite each other. It is only compared, never
 * written. Without it the update applies unconditionally, as before. Note that a stock movement
 * also changes the version, so an edit opened before a movement is refused too.
 *
 * <p>{@code stock} and {@code id} cannot be set here (see {@link CreateProductRequest}).
 */
public record UpdateProductRequest(
        @Size(min = 1, max = 255) String name,
        @Size(max = 100) String articleNumber,
        @Size(max = 2000) String description,
        @PositiveOrZero BigDecimal unitPrice,
        Boolean clearUnitPrice,
        @PositiveOrZero Integer reorderLevel,
        Boolean active,
        SupplierRef supplier,
        Long version
) {}
