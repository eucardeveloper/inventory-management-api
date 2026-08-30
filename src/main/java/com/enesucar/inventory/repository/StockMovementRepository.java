package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.enesucar.inventory.entity.MovementType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * NOTE: this repository intentionally exposes no delete method.
 *
 * <p>It previously carried {@code deleteByProductId(Long)}, which {@code ProductService} called
 * to hard-delete a product's movement history. That silently destroyed the audit trail — the
 * exact thing an append-only ledger exists to prevent. Deleting a product now leaves its
 * history intact; the product itself is deactivated rather than removed.
 */
@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    @EntityGraph(attributePaths = {"product", "product.supplier"})
    List<StockMovement> findAll();

    /** Idempotency lookup: has this key already been processed? */
    Optional<StockMovement> findByIdempotencyKey(String idempotencyKey);

    @EntityGraph(attributePaths = {"product"})
    List<StockMovement> findByProductIdOrderByOccurredAtDesc(Long productId);

    /**
     * The stock ledger view: newest first, with optional filters, paginated server-side.
     * Every filter is nullable so one query serves the unfiltered screen and every combination
     * of filters the UI offers, without dynamic query building.
     */
    @Query("""
            SELECT m FROM StockMovement m
            WHERE (:productId IS NULL OR m.product.id = :productId)
              AND (:movementType IS NULL OR m.movementType = :movementType)
              AND (:from IS NULL OR m.occurredAt >= :from)
              AND (:to IS NULL OR m.occurredAt <= :to)
            ORDER BY m.occurredAt DESC, m.id DESC
            """)
    Page<StockMovement> findLedger(
            @Param("productId") Long productId,
            @Param("movementType") MovementType movementType,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);
}
