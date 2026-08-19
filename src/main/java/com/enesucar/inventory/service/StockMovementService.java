package com.enesucar.inventory.service;

import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.StockMovement;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.exception.ResourceNotFoundException;
import com.enesucar.inventory.repository.StockMovementRepository;
import com.enesucar.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StockMovementService {

    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;

    public List<StockMovement> getAllMovements() {
        return stockMovementRepository.findAll();
    }

    public StockMovement recordMovement(Long productId, Integer quantity, MovementType type, BigDecimal unitPrice) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));

        int currentStock = product.getStock() != null ? product.getStock() : 0;

        if (type == MovementType.OUT && currentStock < quantity) {
            throw new RuntimeException("Insufficient stock!");
        }

        if (type == MovementType.IN) {
            product.setStock(currentStock + quantity);
        } else {
            product.setStock(currentStock - quantity);
        }
        productRepository.save(product);

        StockMovement movement = new StockMovement();
        movement.setProduct(product);
        movement.setQuantity(quantity);
        movement.setUnitPrice(unitPrice);
        movement.setMovementType(type);
        movement.setDate(LocalDateTime.now());

        return stockMovementRepository.save(movement);
    }
}
