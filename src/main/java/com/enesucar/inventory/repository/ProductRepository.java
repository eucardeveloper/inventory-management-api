package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findBySupplierId(Long supplierId);

    List<Product> findByActiveTrue();

    /**
     * Active products whose on-hand stock has reached their reorder level.
     *
     * <p>Ordered by how far below the threshold they are, so the most urgent appear first —
     * a product 40 units short matters more than one that is a single unit short, and a flat
     * alphabetical list would bury it.
     */
    @Query("""
            SELECT p FROM Product p
            WHERE p.active = true
              AND p.reorderLevel IS NOT NULL
              AND p.stock <= p.reorderLevel
            ORDER BY (p.stock - p.reorderLevel) ASC
            """)
    List<Product> findLowStock();
}
