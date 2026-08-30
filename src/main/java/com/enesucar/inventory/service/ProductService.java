package com.enesucar.inventory.service;

import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.exception.ResourceNotFoundException;
import com.enesucar.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product saveProduct(Product product) {
        if (product.getStock() == null) {
            product.setStock(0);
        }
        if (product.getUnitPrice() == null) {
            product.setUnitPrice(java.math.BigDecimal.ZERO);
        }
        if (product.getActive() == null) {
            product.setActive(true);
        }
        return productRepository.save(product);
    }

    public Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }

    /**
     * Deactivates a product instead of deleting it.
     *
     * <p>The previous implementation called {@code stockMovementRepository.deleteByProductId(id)}
     * and then removed the row — destroying every ledger entry the product had ever appeared in
     * so that the foreign keys would not complain. That is the opposite of what an append-only
     * ledger is for: the history a company most needs is usually the history of things it no
     * longer stocks. Deactivation hides the product from operational screens while every past
     * movement, lot and valuation stays readable.
     */
    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
        product.setActive(false);
        productRepository.save(product);
    }

    /** Products at or below their reorder level, worst first — drives the low-stock panel. */
    @Transactional(readOnly = true)
    public List<Product> findLowStockProducts() {
        return productRepository.findLowStock();
    }

    @Transactional(readOnly = true)
    public List<Product> getActiveProducts() {
        return productRepository.findByActiveTrue();
    }
}