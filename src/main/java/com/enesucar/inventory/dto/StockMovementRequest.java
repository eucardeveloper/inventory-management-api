package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.MovementType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Body for booking a stock movement.
 *
 * <p>This used to be a set of {@code @RequestParam} query parameters. Moving it to a validated
 * request body matters for more than tidiness: query strings end up in server logs, browser
 * history and referrer headers, which is the wrong place for operational data, and a body lets
 * Bean Validation reject a malformed movement before any of it reaches the ledger.
 */
@Getter
@Setter
public class StockMovementRequest {

    @NotNull(message = "Product id is required")
    private Long productId;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @NotNull(message = "Movement type is required")
    private MovementType movementType;

    /**
     * Required for IN, ignored for OUT.
     * An outbound movement has no unit cost of its own — FIFO derives it from the lots consumed.
     */
    @PositiveOrZero(message = "Unit cost cannot be negative")
    private BigDecimal unitCost;

    /**
     * Optional caller-generated key (a UUID is the usual choice) that makes this request safe
     * to retry. Sending the same key twice returns the original movement instead of booking a
     * second one. See {@code StockMovement.idempotencyKey} for why this is enforced by a
     * database constraint rather than a pre-check.
     */
    private String idempotencyKey;
}
