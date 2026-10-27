package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.StockMovementRequest;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.repository.MovementLotConsumptionRepository;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.repository.StockLotRepository;
import com.enesucar.inventory.repository.StockMovementRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Pasif ürüne stok hareketi, arayüz gizlese de sunucuda reddedilmeli. */
@ExtendWith(MockitoExtension.class)
class InactiveProductMovementTest {

    @Mock private StockMovementRepository movementRepository;
    @Mock private MovementLotConsumptionRepository consumptionRepository;
    @Mock private StockLotRepository stockLotRepository;
    @Mock private ProductRepository productRepository;
    @Mock private FifoInventoryService fifoService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private StockMovementService service;

    @Test
    void pasifUrununeHareketReddedilir() {
        Product product = new Product();
        product.setId(7L);
        product.setActive(false);
        when(productRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(product));

        StockMovementRequest request = new StockMovementRequest();
        request.setProductId(7L);
        request.setMovementType(MovementType.PURCHASE);
        request.setQuantity(5);
        request.setUnitCost(new BigDecimal("1.0000"));

        assertThrows(IllegalArgumentException.class, () -> service.recordMovement(request, "manager"));
        verify(movementRepository, never()).save(any());
    }
}
