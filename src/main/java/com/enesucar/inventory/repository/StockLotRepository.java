package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.StockLot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface StockLotRepository extends JpaRepository<StockLot, Long> {

    /**
     * The open lots of a product, oldest first — the FIFO consumption queue — with a
     * <b>pessimistic write lock</b> held for the duration of the transaction.
     *
     * <p><b>Why a lock is required here.</b> Recording an OUT movement is a read-modify-write:
     * read the open lots, subtract from them, write them back. Two concurrent OUT movements for
     * the same product both read {@code remainingQuantity = 20}, both subtract 15, and both
     * write 5. Thirty units left the warehouse; the system believes five did. This is a lost
     * update, and in an inventory ledger it silently corrupts both stock levels and COGS.
     *
     * <p><b>Why PESSIMISTIC_WRITE and not optimistic locking.</b> Optimistic locking
     * ({@code @Version} plus retry) is the better choice when conflicts are rare, because it
     * costs nothing in the common case. It is the wrong choice here for two reasons. First,
     * contention is expected rather than rare: a warehouse has several operators booking
     * movements against the same fast-moving SKU at the same time, so retries would be frequent.
     * Second — and decisively — a FIFO consumption spans an unknown number of lot rows. An
     * optimistic failure would surface after the work is done and would force a retry of a
     * multi-row calculation that may consume a different set of lots the second time. Taking the lock up
     * front makes the operation serialisable at the database level and keeps the calculation
     * deterministic. The cost is that concurrent movements on the <em>same product</em> queue up;
     * movements on different products are unaffected, because the lock is scoped by product_id.
     *
     * <p>This translates to {@code SELECT ... FOR UPDATE} in PostgreSQL.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT l FROM StockLot l
            WHERE l.product.id = :productId
              AND l.remainingQuantity > 0
            ORDER BY l.receivedAt ASC, l.id ASC
            """)
    List<StockLot> findOpenLotsForUpdate(@Param("productId") Long productId);

    /** Read-only view of a product's lots for the UI, newest information without locking. */
    @Query("""
            SELECT l FROM StockLot l
            WHERE l.product.id = :productId
            ORDER BY l.receivedAt ASC, l.id ASC
            """)
    List<StockLot> findAllByProductId(@Param("productId") Long productId);

    /**
     * Units physically on hand for a product: the sum of what is left in its open lots.
     * This is the authoritative stock figure — {@code Product.stock} is a denormalised cache
     * of it, kept in step so that list screens do not need an aggregate per row.
     */
    @Query("""
            SELECT COALESCE(SUM(l.remainingQuantity), 0) FROM StockLot l
            WHERE l.product.id = :productId
            """)
    int sumRemainingQuantity(@Param("productId") Long productId);

    /**
     * FIFO valuation of a product: remaining units multiplied by the cost of the lot they
     * actually came from. This is the number that belongs on a balance sheet — multiplying
     * total units by the latest purchase price would overstate or understate it whenever
     * prices have moved.
     */
    @Query("""
            SELECT COALESCE(SUM(l.remainingQuantity * l.unitCost), 0) FROM StockLot l
            WHERE l.product.id = :productId
            """)
    BigDecimal calculateInventoryValue(@Param("productId") Long productId);

    /** Total FIFO valuation across the whole warehouse, for the dashboard KPI. */
    @Query("SELECT COALESCE(SUM(l.remainingQuantity * l.unitCost), 0) FROM StockLot l")
    BigDecimal calculateTotalInventoryValue();
}
