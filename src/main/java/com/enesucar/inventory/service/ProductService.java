package com.enesucar.inventory.service;

import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.exception.ResourceNotFoundException;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product saveProduct(Product product) {
        // stock ve unitPrice null gelirse default değer ata — DB NOT NULL constraint
        if (product.getStock() == null) {
            product.setStock(0);
        }
        if (product.getUnitPrice() == null) {
            product.setUnitPrice(java.math.BigDecimal.ZERO);
        }
        return productRepository.save(product);
    }

    public Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }

    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product not found: " + id);
        }
        stockMovementRepository.deleteByProductId(id);
        productRepository.deleteById(id);
    }
}
