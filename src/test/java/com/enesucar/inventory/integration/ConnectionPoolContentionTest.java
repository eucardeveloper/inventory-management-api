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
import java.util.Queue;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Many writers on the same product hold a pool connection while they wait for the product row lock.
 * With more writers than pooled connections (Hikari's default is 10) the question is whether the
 * waiting ones starve the one that holds the lock. It cannot deadlock, because the lock holder
 * already has its connection, but it is worth showing: 60 simultaneous withdrawals against a pool
 * of 10 must all complete, none may fail with a connection timeout, and the stock must add up.
 */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("connection pool under lock contention")
class ConnectionPoolContentionTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private StockMovementService movementService;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockLotRepository stockLotRepository;

    @Test
    @DisplayName("60 simultaneous withdrawals on one product all complete with a pool of 10")
    void manyWritersOnOneProductAllComplete() throws Exception {
        Product product = new Product();
        product.setName("Pool contention product");
        product.setArticleNumber("POOL-" + UUID.randomUUID());
        product.setStock(0);
        product.setActive(true);
        product = productRepository.save(product);

        StockMovementRequest in = new StockMovementRequest();
        in.setProductId(product.getId());
        in.setMovementType(MovementType.IN);
        in.setQuantity(1000);
        in.setUnitCost(new BigDecimal("1.00"));
        movementService.recordMovement(in, "pool-test");

        int writers = 60;
        Long productId = product.getId();
        ExecutorService pool = Executors.newFixedThreadPool(writers);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch finished = new CountDownLatch(writers);
        AtomicInteger succeeded = new AtomicInteger();
        Queue<Throwable> failures = new ConcurrentLinkedQueue<>();

        for (int i = 0; i < writers; i++) {
            pool.submit(() -> {
                try {
                    startGate.await();
                    StockMovementRequest out = new StockMovementRequest();
                    out.setProductId(productId);
                    out.setMovementType(MovementType.OUT);
                    out.setQuantity(1);
                    movementService.recordMovement(out, "pool-worker");
                    succeeded.incrementAndGet();
                } catch (Throwable t) {
                    failures.add(t);
                } finally {
                    finished.countDown();
                }
            });
        }

        long started = System.nanoTime();
        startGate.countDown();
        boolean allDone = finished.await(90, TimeUnit.SECONDS);
        pool.shutdown();
        long millis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);

        assertThat(allDone).as("all writers finish; a hang would mean starvation (took %d ms)", millis).isTrue();
        assertThat(failures).as("no writer fails, in particular none with a connection or lock timeout").isEmpty();
        assertThat(succeeded.get()).isEqualTo(writers);
        assertThat(stockLotRepository.sumRemainingQuantity(productId)).isEqualTo(1000 - writers);
    }
}
