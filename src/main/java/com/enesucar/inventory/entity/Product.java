package com.enesucar.inventory.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Entity
@Table(
        name = "product",
        indexes = {
                @Index(name = "idx_product_article_number", columnList = "article_number"),
                @Index(name = "idx_product_active", columnList = "active")
        }
)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Stock keeping unit. Unique business identifier, distinct from the surrogate id. */
    @Column(name = "article_number", unique = true)
    private String articleNumber;

    @Column(nullable = false)
    private String name;

    private String description;

    /** Selling price. Not to be confused with a lot's acquisition cost — see {@link StockLot}. */
    private BigDecimal unitPrice;

    /**
     * Units on hand.
     *
     * <p>This is a denormalised cache of {@code SUM(stock_lot.remaining_quantity)}, maintained
     * by {@code StockMovementService} on every booked movement. It exists so a product list of
     * 200 rows does not need 200 aggregate queries. The lots remain the source of truth: if the
     * two ever disagree, the lots are right.
     */
    private Integer stock;

    /**
     * The level at which this product should be reordered.
     *
     * <p>Drives {@code GET /api/products/low-stock} and the warehouse dashboard's traffic-light
     * indicator. Stored per product rather than as a global constant because a fast-moving
     * consumable and a slow-moving spare part have entirely different sensible thresholds.
     */
    @Column(name = "reorder_level")
    private Integer reorderLevel;

    /**
     * Soft-delete flag.
     *
     * <p>Products are deactivated, never physically deleted. A product that has ever moved is
     * referenced by ledger entries and lots, and removing it would either break those references
     * or — as the previous implementation did — require deleting the movement history along with
     * it, destroying the audit trail. Deactivation hides the product from operational screens
     * while every past transaction involving it remains readable.
     */
    @Column(nullable = false)
    private Boolean active = true;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    /** True when on-hand stock has fallen to or below the reorder level. */
    @Transient
    public boolean isLowStock() {
        return reorderLevel != null && stock != null && stock <= reorderLevel;
    }
}
