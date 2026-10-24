package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import com.enesucar.inventory.dto.StockMovementRequest;
import com.enesucar.inventory.dto.StockMovementResponse;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.service.StockMovementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The ledger endpoint documents optional filters (type, from, to). They used to be accepted and
 * silently ignored, so a caller asking for OUT movements got everything. These tests pin the
 * behaviour on a real PostgreSQL.
 */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("ledger filters")
class LedgerFilterTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private StockMovementService movementService;
    @Autowired private ProductRepository productRepository;

    private Product newProduct() {
        Product product = new Product();
        product.setName("Ledger filter product");
        product.setArticleNumber("LED-" + UUID.randomUUID());
        product.setStock(0);
        product.setActive(true);
        return productRepository.save(product);
    }

    private StockMovementResponse book(Product product, MovementType type, int quantity, String unitCost) {
        StockMovementRequest request = new StockMovementRequest();
        request.setProductId(product.getId());
        request.setMovementType(type);
        request.setQuantity(quantity);
        if (unitCost != null) {
            request.setUnitCost(new BigDecimal(unitCost));
        }
        return movementService.recordMovement(request, "ledger-filter-test");
    }

    @Test
    @DisplayName("movementType keeps only that type")
    void filtersByType() {
        Product product = newProduct();
        book(product, MovementType.IN, 10, "2.00");
        book(product, MovementType.OUT, 3, null);

        var outs = movementService.getLedger(product.getId(), MovementType.OUT, null, null, PageRequest.of(0, 50));
        var ins = movementService.getLedger(product.getId(), MovementType.IN, null, null, PageRequest.of(0, 50));

        assertThat(outs.getContent()).hasSize(1).allMatch(m -> m.movementType() == MovementType.OUT);
        assertThat(ins.getContent()).hasSize(1).allMatch(m -> m.movementType() == MovementType.IN);
    }

    @Test
    @DisplayName("from and to bound the time window, inclusive")
    void filtersByTimeWindow() {
        Product product = newProduct();
        book(product, MovementType.IN, 5, "1.00");
        Instant now = Instant.now();

        var inWindow = movementService.getLedger(product.getId(), null,
                now.minusMinutes(5), now.plusMinutes(5), PageRequest.of(0, 50));
        var future = movementService.getLedger(product.getId(), null,
                now.plusHours(1), null, PageRequest.of(0, 50));
        var past = movementService.getLedger(product.getId(), null,
                null, now.minusHours(1), PageRequest.of(0, 50));

        assertThat(inWindow.getTotalElements()).isEqualTo(1);
        assertThat(future.getTotalElements()).isZero();
        assertThat(past.getTotalElements()).isZero();
    }

    @Test
    @DisplayName("without filters the full product history comes back, newest first")
    void noFiltersKeepsTheOriginalBehaviour() {
        Product product = newProduct();
        book(product, MovementType.IN, 10, "2.00");
        book(product, MovementType.OUT, 4, null);

        var all = movementService.getLedger(product.getId(), null, null, null, PageRequest.of(0, 50));

        assertThat(all.getContent()).hasSize(2);
        assertThat(all.getContent().get(0).movementType()).isEqualTo(MovementType.OUT);
    }
}
