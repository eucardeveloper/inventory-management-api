package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
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

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The demo data a visitor sees after {@code docker compose up} must be internally consistent, or the
 * stock report contradicts itself (units in minus units out must equal the current stock).
 *
 * <p>For every product loaded by the real Flyway chain (migration + demo) this checks that
 * {@code product.stock}, the sum of the lots, the net of the ledger and the {@code stock_after} of
 * the newest movement all agree.
 */
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.locations=classpath:db/migration,classpath:db/demo"
})
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("demo data consistency")
class DemoDataConsistencyTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired JdbcTemplate jdbc;

    @Test
    @DisplayName("stock, lots, ledger net and last stock_after agree for every demo product")
    void stockLotsAndLedgerAgree() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT p.article_number,
                       p.stock,
                       COALESCE((SELECT SUM(l.remaining_quantity) FROM stock_lot l WHERE l.product_id = p.id), 0) AS lots,
                       COALESCE((SELECT SUM(CASE WHEN m.movement_type = 'IN' THEN m.quantity ELSE -m.quantity END)
                                 FROM stock_movement m WHERE m.product_id = p.id), 0) AS ledger_net,
                       COALESCE((SELECT m.stock_after FROM stock_movement m WHERE m.product_id = p.id
                                 ORDER BY m.occurred_at DESC, m.id DESC LIMIT 1), 0) AS last_stock_after
                FROM product p
                """);

        assertThat(rows).isNotEmpty();
        for (Map<String, Object> r : rows) {
            long stock = ((Number) r.get("stock")).longValue();
            assertThat(((Number) r.get("lots")).longValue())
                    .as("lots for %s", r.get("article_number")).isEqualTo(stock);
            assertThat(((Number) r.get("ledger_net")).longValue())
                    .as("ledger net for %s", r.get("article_number")).isEqualTo(stock);
            assertThat(((Number) r.get("last_stock_after")).longValue())
                    .as("last stock_after for %s", r.get("article_number")).isEqualTo(stock);
        }
    }
}
