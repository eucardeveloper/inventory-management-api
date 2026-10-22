package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import com.enesucar.inventory.dto.StockMovementRequest;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.service.StockMovementService;
import io.micrometer.core.instrument.MeterRegistry;
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
import java.util.function.DoubleSupplier;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The business metrics behind the dashboard and the alert rules: every booked movement is counted
 * by type, and a movement that leaves a product at or below its reorder level is counted as a
 * low-stock event. They are counted after commit, on an async executor, so the test waits for them.
 */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("business metrics")
class BusinessMetricsTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private StockMovementService movementService;
    @Autowired private ProductRepository productRepository;
    @Autowired private MeterRegistry registry;

    private double movements(String type) {
        var counter = registry.find("inventory.movements").tag("type", type).counter();
        return counter == null ? 0 : counter.count();
    }

    private double lowStockEvents() {
        var counter = registry.find("inventory.low.stock.events").counter();
        return counter == null ? 0 : counter.count();
    }

    private static void awaitIncrease(DoubleSupplier current, double before, String what) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 10_000;
        while (current.getAsDouble() <= before && System.currentTimeMillis() < deadline) {
            Thread.sleep(50);
        }
        assertThat(current.getAsDouble()).as(what).isGreaterThan(before);
    }

    @Test
    @DisplayName("a booked movement and a low-stock result are counted")
    void movementsAndLowStockAreCounted() throws Exception {
        Product product = new Product();
        product.setName("Metrics product");
        product.setArticleNumber("MET-" + UUID.randomUUID());
        product.setStock(0);
        product.setActive(true);
        product.setReorderLevel(5);
        product = productRepository.save(product);

        double inBefore = movements("IN");
        double lowBefore = lowStockEvents();

        StockMovementRequest in = new StockMovementRequest();
        in.setProductId(product.getId());
        in.setMovementType(MovementType.IN);
        in.setQuantity(3);                       // 3 <= reorder level 5
        in.setUnitCost(new BigDecimal("1.00"));
        movementService.recordMovement(in, "metrics-test");

        awaitIncrease(() -> movements("IN"), inBefore, "IN movements counted");
        awaitIncrease(this::lowStockEvents, lowBefore, "low-stock events counted");
    }
}
