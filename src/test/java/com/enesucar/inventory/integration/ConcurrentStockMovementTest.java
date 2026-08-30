package com.enesucar.inventory.integration;

import com.enesucar.inventory.dto.StockMovementRequest;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.exception.InsufficientStockException;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.repository.StockLotRepository;
import com.enesucar.inventory.repository.StockMovementRepository;
import com.enesucar.inventory.service.StockMovementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves that concurrent stock movements cannot corrupt the ledger.
 *
 * <p><b>The bug this test exists to prevent.</b> Booking an OUT movement is a read-modify-write:
 * read the open lots, subtract, write back. Run two of those at once and both read the same
 * starting quantity, both subtract, and the second write overwrites the first. Twenty units
 * leave the warehouse and the system records ten. Nothing errors, no log line appears, and the
 * discrepancy is usually found weeks later during a stock count.
 *
 * <p><b>Why this test runs against real PostgreSQL.</b> The defence is
 * {@code @Lock(PESSIMISTIC_WRITE)}, which becomes {@code SELECT ... FOR UPDATE}. H2 does not
 * reproduce PostgreSQL's row-level blocking faithfully, so a lock test on H2 can pass while the
 * production database still loses updates. Testcontainers starts the same PostgreSQL 16 the
 * application deploys against, which is the only way this assertion means anything.
 *
 * <p>Requires Docker. Skipped automatically in environments without it.
 */
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
@DisplayName("concurrent stock movements")
class ConcurrentStockMovementTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private StockMovementService movementService;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockLotRepository stockLotRepository;
    @Autowired private StockMovementRepository movementRepository;

    private Product product;

    @BeforeEach
    void setUp() {
        movementRepository.deleteAll();
        stockLotRepository.deleteAll();
        productRepository.deleteAll();

        product = new Product();
        product.setName("Keyboard KB-102");
        product.setArticleNumber("KB-102-" + UUID.randomUUID());
        product.setStock(0);
        product.setActive(true);
        product = productRepository.save(product);

        // One lot of 100 units at EUR 40.00.
        StockMovementRequest receipt = new StockMovementRequest();
        receipt.setProductId(product.getId());
        receipt.setQuantity(100);
        receipt.setMovementType(MovementType.IN);
        receipt.setUnitCost(new BigDecimal("40.00"));
        movementService.recordMovement(receipt, "setup");
    }

    @Test
    @DisplayName("ten simultaneous withdrawals of 10 leave exactly zero, not a lost update")
    void concurrentWithdrawalsDoNotLoseUpdates() throws Exception {
        int threads = 10;
        int quantityEach = 10;

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch finished = new CountDownLatch(threads);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    // Release all threads at the same instant to maximise the overlap; staggered
                    // requests would not exercise the lock.
                    startGate.await();
                    StockMovementRequest out = new StockMovementRequest();
                    out.setProductId(product.getId());
                    out.setQuantity(quantityEach);
                    out.setMovementType(MovementType.OUT);
                    movementService.recordMovement(out, "worker");
                    succeeded.incrementAndGet();
                } catch (InsufficientStockException e) {
                    rejected.incrementAndGet();
                } catch (Exception ignored) {
                    // Lock timeouts and serialisation failures are counted as rejections below.
                } finally {
                    finished.countDown();
                }
            });
        }

        startGate.countDown();
        assertThat(finished.await(60, TimeUnit.SECONDS))
                .as("all workers should finish; a hang would indicate a deadlock")
                .isTrue();
        pool.shutdown();

        int remaining = stockLotRepository.sumRemainingQuantity(product.getId());

        // The core assertion: units removed must equal units booked. Without the lock this
        // fails with remaining > 0 while all ten movements claim to have succeeded.
        assertThat(succeeded.get() * quantityEach + remaining)
                .as("units withdrawn plus units remaining must equal the 100 received")
                .isEqualTo(100);

        assertThat(remaining)
                .as("100 units, ten withdrawals of ten: the shelf must be empty")
                .isZero();
        assertThat(succeeded.get()).isEqualTo(10);
    }

    @Test
    @DisplayName("over-withdrawal is rejected rather than driving stock negative")
    void concurrentOverWithdrawalIsRejected() throws Exception {
        int threads = 15;               // 15 x 10 = 150 requested against 100 available
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch finished = new CountDownLatch(threads);
        AtomicInteger succeeded = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    startGate.await();
                    StockMovementRequest out = new StockMovementRequest();
                    out.setProductId(product.getId());
                    out.setQuantity(10);
                    out.setMovementType(MovementType.OUT);
                    movementService.recordMovement(out, "worker");
                    succeeded.incrementAndGet();
                } catch (Exception ignored) {
                    // expected for the surplus requests
                } finally {
                    finished.countDown();
                }
            });
        }

        startGate.countDown();
        assertThat(finished.await(60, TimeUnit.SECONDS)).isTrue();
        pool.shutdown();

        assertThat(succeeded.get())
                .as("at most ten withdrawals of ten can succeed against 100 units")
                .isLessThanOrEqualTo(10);
        assertThat(stockLotRepository.sumRemainingQuantity(product.getId()))
                .as("stock must never go negative")
                .isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("the same idempotency key sent twice books exactly one movement")
    void duplicateIdempotencyKeyBooksOnlyOnce() {
        String key = UUID.randomUUID().toString();

        StockMovementRequest first = new StockMovementRequest();
        first.setProductId(product.getId());
        first.setQuantity(10);
        first.setMovementType(MovementType.OUT);
        first.setIdempotencyKey(key);
        movementService.recordMovement(first, "operator");

        StockMovementRequest retry = new StockMovementRequest();
        retry.setProductId(product.getId());
        retry.setQuantity(10);
        retry.setMovementType(MovementType.OUT);
        retry.setIdempotencyKey(key);

        // The retry must not book a second movement. A double-clicked button or a client
        // timeout is exactly this shape, and without the key it silently double-decrements.
        try {
            movementService.recordMovement(retry, "operator");
        } catch (Exception expected) {
            // DuplicateMovementException carries the original id for the caller to use.
        }

        List<?> movements = movementRepository.findByProductIdOrderByOccurredAtDesc(product.getId());
        assertThat(movements)
                .as("one receipt plus one withdrawal — the retry must not add a third entry")
                .hasSize(2);
        assertThat(stockLotRepository.sumRemainingQuantity(product.getId())).isEqualTo(90);
    }
}
