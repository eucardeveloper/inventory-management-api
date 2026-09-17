package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findBySupplierId(Long supplierId);

    List<Product> findByActiveTrueOrderByIdAsc();

    /**
     * Active products whose on-hand stock has reached their reorder level.
     */
    @Query("""
            SELECT p FROM Product p
            WHERE p.active = true
              AND p.reorderLevel IS NOT NULL
              AND p.stock <= p.reorderLevel
            ORDER BY (p.stock - p.reorderLevel) ASC
            """)
    List<Product> findLowStock();

    /**
     * Loads a product with a PESSIMISTIC_WRITE lock (SELECT ... FOR UPDATE).
     *
     * <p>Used by movement booking to serialise concurrent writes on the same product row.
     * Without this, two threads can read the same stock value, each compute their own
     * post-movement stock, and the second write silently overwrites the first.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}
