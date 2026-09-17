package com.enesucar.inventory.service;

import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.exception.ResourceNotFoundException;
import com.enesucar.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.enesucar.inventory.aspect.Auditable;
import com.enesucar.inventory.entity.AuditAction;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Auditable(action = AuditAction.PRODUCT_CREATED, entityType = "Product", description = "Product created or updated")
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

    /**
     * Partial update: loads the existing entity and overlays only the non-null
     * fields from {@code incoming}.  This makes PUT safe for clients that send
     * a sparse body (e.g. only {@code {name, active}}) without requiring them
     * to include every field.
     */
    @Auditable(action = AuditAction.PRODUCT_CREATED, entityType = "Product", description = "Product updated")
    @Transactional
    public Product patchProduct(Long id, Product incoming) {
        Product existing = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));

        if (incoming.getName() != null)         existing.setName(incoming.getName());
        if (incoming.getDescription() != null)  existing.setDescription(incoming.getDescription());
        if (incoming.getArticleNumber() != null) existing.setArticleNumber(incoming.getArticleNumber());
        if (incoming.getUnitPrice() != null)    existing.setUnitPrice(incoming.getUnitPrice());
        if (incoming.getStock() != null)        existing.setStock(incoming.getStock());
        if (incoming.getReorderLevel() != null) existing.setReorderLevel(incoming.getReorderLevel());
        if (incoming.getActive() != null)       existing.setActive(incoming.getActive());
        if (incoming.getSupplier() != null)     existing.setSupplier(incoming.getSupplier());

        return productRepository.save(existing);
    }

    public Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }

    /**
     * Deactivates a product instead of deleting it.
     */
    @Auditable(action = AuditAction.PRODUCT_DEACTIVATED, entityType = "Product", description = "Product deactivated")
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
        return productRepository.findByActiveTrueOrderByIdAsc();
    }
}

