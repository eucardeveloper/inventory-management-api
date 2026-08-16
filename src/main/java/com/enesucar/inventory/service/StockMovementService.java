package com.enesucar.inventory.service;

import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.StockMovement;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.exception.ResourceNotFoundException;
import com.enesucar.inventory.repository.StockMovementRepository;
import com.enesucar.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

    public StockMovement recordMovement(Long productId, Integer quantity, MovementType type) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));

        if (type == MovementType.OUT && product.getStock() < quantity) {
            throw new RuntimeException("Insufficient stock!");
        }

        if (type == MovementType.IN) {
            product.setStock(product.getStock() + quantity);
        } else {
            product.setStock(product.getStock() - quantity);
        }
        productRepository.save(product);

        StockMovement movement = new StockMovement();
        movement.setProduct(product);
        movement.setQuantity(quantity);
        movement.setMovementType(type);
        movement.setDate(LocalDateTime.now());

        return stockMovementRepository.save(movement);
    }
}
