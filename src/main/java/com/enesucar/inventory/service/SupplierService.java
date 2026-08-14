package com.enesucar.inventory.service;

import com.enesucar.inventory.entity.Supplier;
import com.enesucar.inventory.exception.ResourceNotFoundException;
import com.enesucar.inventory.repository.SupplierRepository;
import com.enesucar.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;

    public List<Supplier> getAllSuppliers() {
        return supplierRepository.findAll();
    }

    public Supplier saveSupplier(Supplier supplier) {
        return supplierRepository.save(supplier);
    }

    public Supplier findSupplier(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lieferant nicht gefunden: " + id));
    }

    @Transactional
    public void deleteSupplier(Long id) {
        if (!supplierRepository.existsById(id)) {
            throw new ResourceNotFoundException("Lieferant nicht gefunden: " + id);
        }
        // Bağlı ürünlerin supplier referansını temizle
        productRepository.findBySupplierId(id)
                .forEach(p -> p.setSupplier(null));
        supplierRepository.deleteById(id);
    }
}
