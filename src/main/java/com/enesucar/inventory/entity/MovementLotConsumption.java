package com.enesucar.inventory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Persists one line of a FIFO consumption: OUT movement X took N units from lot Y at cost Z.
 *
 * <p><b>Why this is stored rather than recomputed.</b> The lots an OUT movement consumed cannot
 * be derived after the fact — later movements change {@code remainingQuantity}, so replaying
 * the FIFO walk against today's lot state gives a different, wrong answer. Two things depend on
 * knowing the real answer: reversing a movement must return units to the exact lots they came
 * from, and an audit must be able to reproduce a historical COGS figure. Both require the
 * decision to be recorded at the moment it was made.
 *
 * <p>It also keeps {@link StockMovement} honest: the movement stores a single {@code totalCost},
 * and these rows are the itemisation that proves it.
 */
@Entity
@Table(
        name = "movement_lot_consumption",
        indexes = @Index(name = "idx_consumption_movement", columnList = "movement_id")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovementLotConsumption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "movement_id", nullable = false, updatable = false)
    private StockMovement movement;

    @Column(name = "lot_id", nullable = false, updatable = false)
    private Long lotId;

    @Column(name = "quantity_taken", nullable = false, updatable = false)
    private Integer quantityTaken;

    /** The lot's unit cost at consumption time, copied so history stays reproducible. */
    @Column(name = "unit_cost", nullable = false, precision = 19, scale = 4, updatable = false)
    private BigDecimal unitCost;

    @Column(name = "line_cost", nullable = false, precision = 19, scale = 4, updatable = false)
    private BigDecimal lineCost;
}
