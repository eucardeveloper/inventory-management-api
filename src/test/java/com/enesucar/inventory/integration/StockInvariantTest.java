package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import com.enesucar.inventory.dto.StockMovementRequest;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.exception.InsufficientStockException;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.repository.StockLotRepository;
import com.enesucar.inventory.service.StockMovementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.Random;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The inventory invariant: {@code product.stock} (a denormalised cache) must always equal
 * {@code SUM(stock_lot.remaining_quantity)} (the source of truth), and neither may go negative.
 *
 * <p>Runs on a real PostgreSQL 16 with the REAL Flyway schema ({@code ddl-auto=validate}), so it
 * also proves that the entities match the migrations and that the V8 CHECK constraints exist.
 */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("stock invariants")
class StockInvariantTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private StockMovementService movementService;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockLotRepository stockLotRepository;
    @Autowired private JdbcTemplate jdbc;

    @Test
    @DisplayName("after 200 random IN/OUT movements stock equals the sum of the lots and is never negative")
    void stockEqualsSumOfLots_afterRandomMovements() {
        Product product = newProduct();
        Random random = new Random(42);

        for (int i = 0; i < 200; i++) {
            StockMovementRequest request = new StockMovementRequest();
            request.setProductId(product.getId());
            if (random.nextInt(100) < 45) {
                request.setMovementType(MovementType.IN);
                request.setQuantity(1 + random.nextInt(50));
                request.setUnitCost(BigDecimal.valueOf(10 + random.nextInt(40)));
            } else {
                request.setMovementType(MovementType.OUT);
                request.setQuantity(1 + random.nextInt(30));
            }
            try {
                movementService.recordMovement(request, "invariant-test");
            } catch (InsufficientStockException expected) {
                // a withdrawal larger than the stock must be rejected, not booked
            }

            int stock = productRepository.findById(product.getId()).orElseThrow().getStock();
            int lots = stockLotRepository.sumRemainingQuantity(product.getId());
            assertThat(stock).as("stock cache after step %d", i).isEqualTo(lots).isGreaterThanOrEqualTo(0);
        }
    }

    @Test
    @DisplayName("the database rejects negative stock even if the application is bypassed")
    void database_rejectsNegativeStock() {
        Product product = newProduct();

        assertThatThrownBy(() ->
                jdbc.update("UPDATE product SET stock = -1 WHERE id = ?", product.getId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("chk_product_stock_non_negative");
    }

    @Test
    @DisplayName("the database rejects a lot whose remaining quantity exceeds its quantity")
    void database_rejectsLotRemainingAboveQuantity() {
        Product product = newProduct();
        StockMovementRequest receipt = new StockMovementRequest();
        receipt.setProductId(product.getId());
        receipt.setMovementType(MovementType.IN);
        receipt.setQuantity(10);
        receipt.setUnitCost(new BigDecimal("5.00"));
        movementService.recordMovement(receipt, "invariant-test");

        assertThatThrownBy(() ->
                jdbc.update("UPDATE stock_lot SET remaining_quantity = quantity + 1 WHERE product_id = ?",
                        product.getId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("chk_stock_lot_remaining_in_range");
    }

    private Product newProduct() {
        Product product = new Product();
        product.setName("Invariant test product");
        product.setArticleNumber("INV-" + UUID.randomUUID());
        product.setStock(0);
        product.setActive(true);
        return productRepository.save(product);
    }
}
