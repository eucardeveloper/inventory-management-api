package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.MovementType;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Body for booking a stock movement.
 *
 * <p>A validated request body rather than query parameters: query strings end up in server logs,
 * browser history and referrer headers, which is the wrong place for operational data, and a body
 * lets Bean Validation reject a malformed movement before any of it reaches the ledger.
 */
@Getter
@Setter
public class StockMovementRequest {

    /** Upper bound per movement; stock columns are 32-bit integers, so unbounded input ended in a 500. */
    public static final int MAX_QUANTITY_PER_MOVEMENT = 1_000_000;

    @NotNull(message = "Product id is required")
    private Long productId;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = MAX_QUANTITY_PER_MOVEMENT, message = "Quantity must be at most 1000000 per movement")
    private Integer quantity;

    @NotNull(message = "Movement type is required")
    private MovementType movementType;

    /**
     * Required for IN, ignored for OUT.
     * An outbound movement has no unit cost of its own — FIFO derives it from the lots consumed.
     */
    @PositiveOrZero(message = "Unit cost cannot be negative")
    @Digits(integer = 15, fraction = 4, message = "Unit cost allows at most 15 digits before and 4 after the decimal point")
    private BigDecimal unitCost;

    /**
     * Optional caller-generated key (a UUID is the usual choice) that makes this request safe
     * to retry. Sending the same key twice returns the original movement instead of booking a
     * second one. See {@code StockMovement.idempotencyKey} for why this is enforced by a
     * database constraint rather than a pre-check. The column holds 100 characters; a longer key is
     * refused here instead of failing in the database.
     */
    @Size(max = 100, message = "Idempotency key must be at most 100 characters")
    private String idempotencyKey;
}
