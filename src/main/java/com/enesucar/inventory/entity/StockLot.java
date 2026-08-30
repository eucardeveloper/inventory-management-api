package com.enesucar.inventory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A single batch of stock received at one point in time, at one unit cost.
 *
 * <p><b>Why lots exist at all.</b> A product cannot be valued by a single {@code stock}
 * integer once it has been bought at different prices. If 20 units arrive at EUR 40.00 and
 * 30 more arrive at EUR 42.50, "50 units" is not a meaningful figure — the 50 units are worth
 * EUR 2,075.00, and which units leave the warehouse next determines the cost of goods sold.
 * FIFO ("first in, first out") answers that: the oldest lot is consumed first. This entity is
 * the record of one such lot, and it is the foundation every other inventory feature sits on.
 *
 * <p><b>The invariant.</b> {@code quantity} is the size of the batch when it arrived and never
 * changes. {@code remainingQuantity} starts equal to it and only ever decreases, as OUT
 * movements consume the lot. A lot with {@code remainingQuantity == 0} is exhausted but is
 * deliberately kept: it is part of the audit trail and past valuations must stay reproducible.
 *
 * <p><b>Why {@code unitCost} is not {@code Product.unitPrice}.</b> The price a product is sold
 * at is a commercial decision that changes freely. The cost a specific batch was acquired at is
 * a historical fact that must never change, or the books stop balancing. They are different
 * numbers with different lifetimes, so they live on different tables.
 */
@Entity
@Table(
        name = "stock_lot",
        indexes = {
                // FIFO consumption always queries "open lots for this product, oldest first".
                // This composite index serves exactly that access path.
                @Index(name = "idx_stock_lot_product_received", columnList = "product_id, received_at"),
                @Index(name = "idx_stock_lot_remaining", columnList = "remaining_quantity")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Units received in this batch. Set once on creation and never mutated. */
    @Column(name = "quantity", nullable = false, updatable = false)
    private Integer quantity;

    /** Units of this batch still in the warehouse. Decreases as OUT movements consume it. */
    @Column(name = "remaining_quantity", nullable = false)
    private Integer remainingQuantity;

    /**
     * Acquisition cost per unit for this batch, in EUR.
     * scale = 4 rather than 2: a per-unit cost may legitimately carry sub-cent precision
     * (e.g. a 1,000-unit shipment with freight apportioned across it). Rounding to cents
     * happens when a total is presented, not when a unit cost is stored.
     */
    @Column(name = "unit_cost", nullable = false, precision = 19, scale = 4, updatable = false)
    private BigDecimal unitCost;

    /** When this batch entered the warehouse. This is the FIFO ordering key. */
    @Column(name = "received_at", nullable = false, updatable = false)
    private LocalDateTime receivedAt;

    /** The IN movement that created this lot, for traceability back to the ledger. */
    @Column(name = "source_movement_id", updatable = false)
    private Long sourceMovementId;

    /** True once every unit in this batch has been consumed. */
    @Transient
    public boolean isExhausted() {
        return remainingQuantity != null && remainingQuantity == 0;
    }

    /**
     * Consumes up to {@code requested} units from this lot and returns how many were actually
     * taken — which is less than requested when the lot runs out mid-way and the caller must
     * continue into the next lot.
     *
     * @throws IllegalArgumentException if asked for a non-positive amount
     */
    public int consume(int requested) {
        if (requested <= 0) {
            throw new IllegalArgumentException("Consumption must be positive, was: " + requested);
        }
        int taken = Math.min(requested, this.remainingQuantity);
        this.remainingQuantity -= taken;
        return taken;
    }
}
