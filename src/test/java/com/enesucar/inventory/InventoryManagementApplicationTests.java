package com.enesucar.inventory;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Context load check.
 *
 * <p>Previously this expected a PostgreSQL already running on localhost:5436, so it failed on
 * any machine that did not happen to have one — which is why CI was configured with
 * {@code -DskipTests}. Testcontainers supplies the database, so the test is now self-contained
 * and CI can run the suite for real.
 */
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class InventoryManagementApplicationTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    void contextLoads() {
        // Asserts that every bean wires: the FIFO service, the lock-carrying repository,
        // method security, and the RFC 7807 handler.
    }
}
