package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import com.enesucar.inventory.dto.StockMovementRequest;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.repository.StockLotRepository;
import com.enesucar.inventory.service.StockMovementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Stock is a 32-bit integer in the column, the lot sum and the product cache. Many receipts, each
 * within the per-movement limit, must not be able to push it past that range: the receipt that
 * would is refused with an IllegalArgumentException (HTTP 400) and nothing is booked.
 */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("stock overflow guard")
class StockOverflowGuardTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private StockMovementService movementService;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockLotRepository stockLotRepository;

    private StockMovementRequest receipt(Long productId, int quantity) {
        StockMovementRequest request = new StockMovementRequest();
        request.setProductId(productId);
        request.setMovementType(MovementType.IN);
        request.setQuantity(quantity);
        request.setUnitCost(BigDecimal.ONE);
        return request;
    }

    @Test
    @DisplayName("a receipt that would exceed the 32-bit stock range is refused and books nothing")
    void receiptBeyondIntRangeIsRefused() {
        Product product = new Product();
        product.setName("Overflow guard product");
        product.setArticleNumber("OVF-" + UUID.randomUUID());
        product.setStock(0);
        product.setActive(true);
        product = productRepository.save(product);

        // 2 x 1,000,000,000 fits (2,000,000,000 < 2,147,483,647). Bypass the DTO limit by calling the
        // service directly: the guard must hold even if a caller skips controller validation.
        movementService.recordMovement(receipt(product.getId(), 1_000_000_000), "overflow-test");
        movementService.recordMovement(receipt(product.getId(), 1_000_000_000), "overflow-test");

        Long id = product.getId();
        assertThatThrownBy(() -> movementService.recordMovement(receipt(id, 200_000_000), "overflow-test"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maximum stock");

        assertThat(stockLotRepository.sumRemainingQuantity(id)).isEqualTo(2_000_000_000);
        assertThat(productRepository.findById(id).orElseThrow().getStock()).isEqualTo(2_000_000_000);
    }
}
