package com.enesucar.inventory;

import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.StockMovement;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.repository.StockMovementRepository;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.service.StockMovementService;
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
class StockMovementServiceTest {

    @Mock
    private StockMovementRepository stockMovementRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private StockMovementService stockMovementService;

    @Test
    void getAllMovements_shouldReturnList() {
        StockMovement m1 = new StockMovement();
        StockMovement m2 = new StockMovement();

        when(stockMovementRepository.findAll()).thenReturn(Arrays.asList(m1, m2));

        List<StockMovement> result = stockMovementService.getAllMovements();

        assertEquals(2, result.size());
        verify(stockMovementRepository, times(1)).findAll();
    }

    @Test
    void recordMovement_incoming_shouldIncreaseStock() {
        Product product = new Product();
        product.setId(1L);
        product.setStock(10);

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(stockMovementRepository.save(any())).thenReturn(new StockMovement());

        stockMovementService.recordMovement(1L, 5, MovementType.IN);

        assertEquals(15, product.getStock());
        verify(productRepository, times(1)).save(product);
    }

    @Test
    void recordMovement_outgoing_shouldDecreaseStock() {
        Product product = new Product();
        product.setId(1L);
        product.setStock(10);

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(stockMovementRepository.save(any())).thenReturn(new StockMovement());

        stockMovementService.recordMovement(1L, 3, MovementType.OUT);

        assertEquals(7, product.getStock());
        verify(productRepository, times(1)).save(product);
    }

    @Test
    void recordMovement_outgoing_insufficientStock_shouldThrowException() {
        Product product = new Product();
        product.setId(1L);
        product.setStock(5);

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                stockMovementService.recordMovement(1L, 10, MovementType.OUT));

        assertEquals("Insufficient stock!", exception.getMessage());
    }
}
