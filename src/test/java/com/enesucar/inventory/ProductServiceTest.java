package com.enesucar.inventory;

import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.service.ProductService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private ProductService productService;

    @Test
    void getAllProducts_shouldReturnList() {
        Product p1 = new Product();
        p1.setId(1L);
        p1.setName("Laptop");

        Product p2 = new Product();
        p2.setId(2L);
        p2.setName("Mouse");

        when(productRepository.findAll()).thenReturn(Arrays.asList(p1, p2));

        List<Product> result = productService.getAllProducts();

        assertEquals(2, result.size());
        assertEquals("Laptop", result.get(0).getName());
        verify(productRepository, times(1)).findAll();
    }

    @Test
    void findProduct_shouldReturnProduct() {
        Product p = new Product();
        p.setId(1L);
        p.setName("Laptop");

        when(productRepository.findById(1L)).thenReturn(Optional.of(p));

        Product result = productService.findProduct(1L);

        assertNotNull(result);
        assertEquals("Laptop", result.getName());
        verify(productRepository, times(1)).findById(1L);
    }

    @Test
    void saveProduct_shouldSaveProduct() {
        Product p = new Product();
        p.setName("Laptop");

        when(productRepository.save(p)).thenReturn(p);

        Product result = productService.saveProduct(p);

        assertNotNull(result);
        assertEquals("Laptop", result.getName());
        verify(productRepository, times(1)).save(p);
    }
}
