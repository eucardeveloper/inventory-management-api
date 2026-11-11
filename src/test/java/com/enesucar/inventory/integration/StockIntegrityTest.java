package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The integrity check compares four figures per product: the cached stock, the sum of the open lots, the net of
 * the append-only ledger and the last stock-after. On healthy data it reports zero problems, after real movements
 * it still does, and when the cache is tampered with it names exactly the product that drifted.
 */
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.locations=classpath:db/migration,classpath:db/demo",
        "app.login-rate-limit.max-attempts=1000"
})
@AutoConfigureMockMvc
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("stock integrity check")
class StockIntegrityTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    final ObjectMapper json = new ObjectMapper();

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    private JsonNode check(String token, boolean onlyInconsistent) throws Exception {
        String body = mvc.perform(get("/api/stock/integrity?onlyInconsistent=" + onlyInconsistent)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body);
    }

    @Test
    @DisplayName("healthy data: every product is consistent; STAFF is refused")
    void healthyDataIsConsistent() throws Exception {
        JsonNode report = check(login("manager", "manager123"), false);
        assertThat(report.get("checkedProducts").asInt()).isPositive();
        assertThat(report.get("inconsistentProducts").asInt()).isZero();
        assertThat(report.get("rows").size()).isEqualTo(report.get("checkedProducts").asInt());

        String staff = login("staff", "staff123");
        mvc.perform(get("/api/stock/integrity").header("Authorization", "Bearer " + staff))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("real movements keep it consistent")
    void afterMovementsStillConsistent() throws Exception {
        String admin = login("admin", "admin123");
        Long productId = jdbc.queryForObject("SELECT id FROM product WHERE active = true ORDER BY id LIMIT 1", Long.class);
        mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + productId + ",\"movementType\":\"IN\",\"quantity\":7,\"unitCost\":3}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + productId + ",\"movementType\":\"OUT\",\"quantity\":2}"))
                .andExpect(status().isCreated());

        assertThat(check(admin, false).get("inconsistentProducts").asInt()).isZero();
    }

    @Test
    @DisplayName("a drifted stock cache is detected and the product is named")
    void driftIsDetected() throws Exception {
        String admin = login("admin", "admin123");
        Long productId = jdbc.queryForObject("SELECT id FROM product ORDER BY id LIMIT 1", Long.class);
        jdbc.update("UPDATE product SET stock = stock + 1 WHERE id = ?", productId);
        try {
            JsonNode report = check(admin, true);
            assertThat(report.get("inconsistentProducts").asInt()).isEqualTo(1);
            JsonNode row = report.get("rows").get(0);
            assertThat(row.get("productId").asLong()).isEqualTo(productId);
            assertThat(row.get("consistent").asBoolean()).isFalse();
            assertThat(row.get("stock").asLong()).isEqualTo(row.get("lotTotal").asLong() + 1);
        } finally {
            jdbc.update("UPDATE product SET stock = stock - 1 WHERE id = ?", productId);
        }
        assertThat(check(admin, false).get("inconsistentProducts").asInt()).isZero();
    }
}
