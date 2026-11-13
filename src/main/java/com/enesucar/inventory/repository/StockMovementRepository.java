package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.enesucar.inventory.entity.MovementType;
import java.util.List;
import java.util.Optional;

/**
 * NOTE: this repository intentionally exposes no delete method.
 *
 * <p>Deleting a product must not delete its movement history: that would destroy the audit trail,
 * which is exactly what an append-only ledger exists to prevent. A deleted product is deactivated
 * and its history stays intact.
 */
@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long>, JpaSpecificationExecutor<StockMovement> {

    @EntityGraph(attributePaths = {"product", "product.supplier"})
    List<StockMovement> findAll();

    /**
     * Product id of a movement, read as a plain value so the movement entity is NOT cached in the
     * persistence context. Reverse needs this to lock the product row first and only then load the
     * movement, so it sees what concurrent transactions committed.
     */
    @Query("SELECT m.product.id FROM StockMovement m WHERE m.id = :id")
    Optional<Long> findProductIdById(@Param("id") Long id);

    /** Idempotency lookup: has this key already been processed? */
    Optional<StockMovement> findByIdempotencyKey(String idempotencyKey);

    @EntityGraph(attributePaths = {"product"})
    List<StockMovement> findByProductIdOrderByOccurredAtDesc(Long productId);

    /**
     * Stock ledger — all movements, newest first, paginated.
     * No nullable parameters to avoid PostgreSQL type-inference failures.
     */
    @Query("SELECT m FROM StockMovement m ORDER BY m.occurredAt DESC, m.id DESC")
    Page<StockMovement> findLedger(Pageable pageable);

    @Query("SELECT m FROM StockMovement m WHERE m.product.id = :productId ORDER BY m.occurredAt DESC, m.id DESC")
    Page<StockMovement> findLedgerByProduct(@Param("productId") Long productId, Pageable pageable);

    /**
     * Units moved per product and direction, summed in the database: rows of {productId, movementType, units}.
     * Corrections are left out on both sides (a reversed movement and the reversal that undid it), so the
     * totals say what really came in and went out. The pair cancels, so in minus out still equals the stock.
     */
    @Query("""
            SELECT m.product.id, m.movementType, SUM(m.quantity) FROM StockMovement m
            WHERE m.reversalOf IS NULL AND m.reversedById IS NULL
            GROUP BY m.product.id, m.movementType
            """)
    List<Object[]> sumQuantitiesByProductAndType();
}
