package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import com.enesucar.inventory.dto.StockMovementRequest;
import com.enesucar.inventory.dto.StockMovementResponse;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.exception.InsufficientStockException;
import com.enesucar.inventory.exception.InvalidReversalException;
import com.enesucar.inventory.exception.ResourceNotFoundException;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.repository.StockLotRepository;
import com.enesucar.inventory.service.StockMovementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The ledger is append-only: a mistake is corrected by a reversal, never by an edit. These tests
 * run on a real PostgreSQL with the real Flyway schema and check the FIFO position after a
 * reversal, the rules about what may be reversed, and that nothing is deleted.
 */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("reversing a movement")
class ReverseMovementTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private StockMovementService movementService;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockLotRepository stockLotRepository;
    @Autowired private JdbcTemplate jdbc;

    private Product newProduct() {
        Product product = new Product();
        product.setName("Reversal test product");
        product.setArticleNumber("REV-" + UUID.randomUUID());
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
        return movementService.recordMovement(request, "reversal-test");
    }

    private int stockOf(Product product) {
        return productRepository.findById(product.getId()).orElseThrow().getStock();
    }

    private int movementCount(Product product) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM stock_movement WHERE product_id = ?", Integer.class, product.getId());
    }

    @Test
    @DisplayName("reversing an OUT gives the units back to the lots they came from")
    void reversingAnOutRestoresTheOriginalLots() {
        Product product = newProduct();
        book(product, MovementType.IN, 10, "5.00");
        book(product, MovementType.IN, 10, "8.00");
        StockMovementResponse out = book(product, MovementType.OUT, 14, null); // 10 @5 + 4 @8
        assertThat(stockOf(product)).isEqualTo(6);

        StockMovementResponse reversal = movementService.reverseMovement(out.id(), "DATA_ENTRY_ERROR", "supervisor");

        assertThat(reversal.movementType()).isEqualTo(MovementType.IN);
        assertThat(reversal.quantity()).isEqualTo(14);
        assertThat(reversal.reversalOfId()).isEqualTo(out.id());
        assertThat(reversal.reasonCode()).isEqualTo("DATA_ENTRY_ERROR");
        assertThat(reversal.stockAfter()).isEqualTo(20);
        assertThat(stockOf(product)).isEqualTo(20);
        assertThat(stockLotRepository.sumRemainingQuantity(product.getId())).isEqualTo(20);

        // the lots are whole again, at their original costs: 10 @5.00 and 10 @8.00
        Integer fullLots = jdbc.queryForObject(
                "SELECT COUNT(*) FROM stock_lot WHERE product_id = ? AND remaining_quantity = quantity",
                Integer.class, product.getId());
        assertThat(fullLots).isEqualTo(2);
    }

    @Test
    @DisplayName("the original stays in the ledger, marked as reversed; the correction is a new row")
    void ledgerIsAppendOnly() {
        Product product = newProduct();
        book(product, MovementType.IN, 10, "5.00");
        StockMovementResponse out = book(product, MovementType.OUT, 4, null);
        int before = movementCount(product);

        StockMovementResponse reversal = movementService.reverseMovement(out.id(), "TEST", "supervisor");

        assertThat(movementCount(product)).isEqualTo(before + 1);
        StockMovementResponse original = movementService.findMovement(out.id());
        assertThat(original.reversedById()).isEqualTo(reversal.id());
        assertThat(original.quantity()).isEqualTo(4);
        assertThat(original.movementType()).isEqualTo(MovementType.OUT);
    }

    @Test
    @DisplayName("reversing an IN takes the received units back out")
    void reversingAnInConsumesTheUnits() {
        Product product = newProduct();
        StockMovementResponse in = book(product, MovementType.IN, 10, "5.00");

        StockMovementResponse reversal = movementService.reverseMovement(in.id(), "WRONG_PRODUCT", "supervisor");

        assertThat(reversal.movementType()).isEqualTo(MovementType.OUT);
        assertThat(stockOf(product)).isZero();
        assertThat(stockLotRepository.sumRemainingQuantity(product.getId())).isZero();
    }

    @Test
    @DisplayName("a movement can be reversed only once")
    void secondReversalIsRejected() {
        Product product = newProduct();
        book(product, MovementType.IN, 10, "5.00");
        StockMovementResponse out = book(product, MovementType.OUT, 3, null);
        movementService.reverseMovement(out.id(), "TEST", "supervisor");

        assertThatThrownBy(() -> movementService.reverseMovement(out.id(), "TEST", "supervisor"))
                .isInstanceOf(InvalidReversalException.class)
                .hasMessageContaining("already been reversed");
        assertThat(stockOf(product)).isEqualTo(10);
    }

    @Test
    @DisplayName("a reversal cannot itself be reversed")
    void reversalOfAReversalIsRejected() {
        Product product = newProduct();
        book(product, MovementType.IN, 10, "5.00");
        StockMovementResponse out = book(product, MovementType.OUT, 3, null);
        StockMovementResponse reversal = movementService.reverseMovement(out.id(), "TEST", "supervisor");

        assertThatThrownBy(() -> movementService.reverseMovement(reversal.id(), "TEST", "supervisor"))
                .isInstanceOf(InvalidReversalException.class)
                .hasMessageContaining("itself a reversal");
    }

    @Test
    @DisplayName("an IN whose units were already shipped cannot be reversed; nothing is booked")
    void reversingAnInThatWasSoldIsRejectedAtomically() {
        Product product = newProduct();
        StockMovementResponse in = book(product, MovementType.IN, 10, "5.00");
        book(product, MovementType.OUT, 8, null);
        int before = movementCount(product);

        assertThatThrownBy(() -> movementService.reverseMovement(in.id(), "TEST", "supervisor"))
                .isInstanceOf(InsufficientStockException.class);

        assertThat(movementCount(product)).isEqualTo(before);
        assertThat(stockOf(product)).isEqualTo(2);
        assertThat(movementService.findMovement(in.id()).reversedById()).isNull();
    }

    @Test
    @DisplayName("an unknown movement id is a not-found error")
    void unknownMovementIsNotFound() {
        assertThatThrownBy(() -> movementService.reverseMovement(987_654_321L, "TEST", "supervisor"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
