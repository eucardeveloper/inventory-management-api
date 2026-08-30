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
 * One immutable entry in the stock ledger.
 *
 * <p><b>Append-only: why this table is never updated or deleted.</b> Stock movements are
 * financial records. They determine inventory valuation, cost of goods sold, and what the
 * warehouse believes it holds. If a row can be edited, then last month's closing valuation can
 * change retroactively and no report is reproducible; if a row can be deleted, the history has
 * a hole exactly where someone had a reason to make one. Real ledgers — accounting systems,
 * banking cores, event stores — solve this the same way: entries are facts, and facts are only
 * ever added.
 *
 * <p><b>How mistakes are corrected, then.</b> Not by editing the wrong entry, but by appending
 * a <i>reversal</i>: a second, opposite entry that points back at the first via
 * {@link #reversalOf} and carries a {@link #reasonCode} explaining why. The original stays
 * visible, the correction stays visible, and the relationship between them is explicit. An
 * auditor can see both that a mistake happened and how it was handled — which is more
 * trustworthy than a table where mistakes never appear to have happened at all.
 *
 * <p>The columns below are therefore all {@code updatable = false}. That is enforcement, not
 * documentation: Hibernate will omit them from any UPDATE statement it generates, so even a
 * caller who loads an entity, mutates it and saves it cannot alter a booked movement.
 */
@Entity
@Table(
        name = "stock_movement",
        indexes = {
                @Index(name = "idx_movement_product_date", columnList = "product_id, occurred_at"),
                @Index(name = "idx_movement_occurred", columnList = "occurred_at")
        },
        uniqueConstraints = {
                // The database is the only place an idempotency guarantee can actually be made.
                // See the idempotencyKey field for why an application-level check is not enough.
                @UniqueConstraint(name = "uk_movement_idempotency_key", columnNames = "idempotency_key")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false, updatable = false)
    private Product product;

    /** Units moved. Always positive — direction is carried by {@link #movementType}. */
    @Column(name = "quantity", nullable = false, updatable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, updatable = false, length = 20)
    private MovementType movementType;

    /**
     * IN: the acquisition cost per unit for the lot this movement created.
     * OUT: null — an outbound movement has no single unit cost, because FIFO may draw it from
     * several lots at different prices. Its money value is {@link #totalCost}.
     */
    @Column(name = "unit_cost", precision = 19, scale = 4, updatable = false)
    private BigDecimal unitCost;

    /**
     * IN: quantity x unitCost.
     * OUT: the FIFO cost of goods sold, i.e. the sum of every lot line this movement consumed.
     */
    @Column(name = "total_cost", nullable = false, precision = 19, scale = 4, updatable = false)
    private BigDecimal totalCost;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private LocalDateTime occurredAt;

    /** Operator who booked the movement. A ledger without an actor is not an audit trail. */
    @Column(name = "performed_by", nullable = false, updatable = false, length = 100)
    private String performedBy;

    /**
     * Caller-supplied key that makes booking a movement safe to retry.
     *
     * <p><b>The problem it solves.</b> A warehouse operator double-clicks "Confirm", or a
     * mobile client times out and retries, or a network hiccup causes the same POST to arrive
     * twice. Without a key, each arrival books a separate movement and stock is decremented
     * twice for one physical event. Unlike most duplicate-submission bugs this one is invisible:
     * nothing errors, the numbers simply drift.
     *
     * <p><b>Why the constraint is in the database.</b> Checking "does a movement with this key
     * already exist?" in Java before inserting is a race: two concurrent requests both check,
     * both find nothing, and both insert. Only a UNIQUE constraint can arbitrate, because only
     * the database sees both inserts. The service therefore attempts the insert and treats the
     * resulting constraint violation as "this was already processed" — the correct pattern is
     * to let the write fail, not to try to predict that it will.
     *
     * <p>Nullable: a key is optional, so scripted bulk imports that cannot supply one still work.
     */
    @Column(name = "idempotency_key", unique = true, updatable = false, length = 100)
    private String idempotencyKey;

    // ---- Reversal linkage -------------------------------------------------------------

    /** Set on a correcting entry: the original movement this one reverses. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reversal_of_id", updatable = false)
    private StockMovement reversalOf;

    /**
     * Set on an original entry once it has been reversed. Deliberately the one mutable column
     * on this table: it does not change what the entry says happened, it records that a later
     * entry corrected it, and keeping it here lets the ledger screen mark reversed rows without
     * a second query.
     */
    @Column(name = "reversed_by_id")
    private Long reversedById;

    /** Why a correction was made, e.g. WRONG_QUANTITY, DAMAGED_GOODS, DATA_ENTRY_ERROR. */
    @Column(name = "reason_code", updatable = false, length = 50)
    private String reasonCode;

    /** Units on hand after this movement, so the ledger can show a running balance cheaply. */
    @Column(name = "stock_after", nullable = false, updatable = false)
    private Integer stockAfter;

    public boolean isReversal() {
        return reversalOf != null;
    }

    public boolean isReversed() {
        return reversedById != null;
    }
}
