package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.StockMovement;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    @EntityGraph(attributePaths = {"product", "product.supplier"})
    List<StockMovement> findAll();
}
