package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The audit trail records who did what. Entries are written asynchronously (so they never delay
 * the response), which is why these tests poll for the row instead of reading it immediately.
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
@DisplayName("audit trail")
class AuditTrailTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    final ObjectMapper json = new ObjectMapper();
    @Autowired JdbcTemplate jdbc;

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    /** Polls until the supplier returns a positive number, or fails after ten seconds. */
    private static void awaitPositive(String what, Supplier<Integer> count) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline) {
            if (count.get() > 0) {
                return;
            }
            Thread.sleep(100);
        }
        assertThat(count.get()).as("audit rows for: " + what).isPositive();
    }

    private int auditRows(String action, String username) {
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE action = ? AND username = ?",
                Integer.class, action, username);
    }

    private int auditRows(String action, String username, String entityId) {
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE action = ? AND username = ? AND entity_id = ?",
                Integer.class, action, username, entityId);
    }

    @Test
    @DisplayName("a login is recorded with the user's name")
    void loginIsAudited() throws Exception {
        login("admin", "admin123");

        awaitPositive("USER_LOGIN by admin", () -> auditRows("USER_LOGIN", "admin"));
    }

    @Test
    @DisplayName("a booked movement and its reversal are recorded under the operator who did them")
    void movementAndReversalAreAudited() throws Exception {
        String staff = login("staff", "staff123");
        String manager = login("manager", "manager123");
        Long productId = jdbc.queryForObject("SELECT id FROM product WHERE stock > 0 ORDER BY id LIMIT 1", Long.class);

        String created = mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + staff)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + productId + ",\"movementType\":\"OUT\",\"quantity\":1}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String movementId = json.readTree(created).get("id").asText();

        awaitPositive("movement " + movementId + " by staff",
                () -> auditRows("STOCK_OUT", "staff", movementId));

        String reversed = mvc.perform(post("/api/stock/movements/" + movementId + "/reverse")
                        .header("Authorization", "Bearer " + manager)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reasonCode\":\"AUDIT_TEST\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String reversalId = json.readTree(reversed).get("id").asText();

        awaitPositive("reversal " + reversalId + " by manager",
                () -> auditRows("STOCK_ADJUSTED", "manager", reversalId));
    }

    @Test
    @DisplayName("a failed operation leaves no audit entry for the movement")
    void failedMovementIsNotAudited() throws Exception {
        String staff = login("staff", "staff123");
        Long productId = jdbc.queryForObject("SELECT id FROM product ORDER BY id LIMIT 1", Long.class);
        Integer before = jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE entity_type = 'StockMovement' AND username = 'staff'", Integer.class);

        mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + staff)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + productId + ",\"movementType\":\"OUT\",\"quantity\":999999}"))
                .andExpect(status().isConflict());
        Thread.sleep(500); // an (unwanted) async audit write would land within this time

        Integer after = jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE entity_type = 'StockMovement' AND username = 'staff'", Integer.class);
        assertThat(after).isEqualTo(before);
    }

    @Test
    @DisplayName("deactivating a product writes exactly one audit row, and it names the product")
    void voidMethodIsAuditedOnceWithTheEntityId() throws Exception {
        String admin = login("admin", "admin123");
        Long productId = jdbc.queryForObject("SELECT id FROM product WHERE active = true ORDER BY id DESC LIMIT 1", Long.class);

        mvc.perform(delete("/api/products/" + productId).header("Authorization", "Bearer " + admin))
                .andExpect(status().is2xxSuccessful());

        awaitPositive("PRODUCT_DEACTIVATED " + productId,
                () -> auditRows("PRODUCT_DEACTIVATED", "admin", String.valueOf(productId)));
        Thread.sleep(500); // a second, duplicate row would land within this time
        assertThat(auditRows("PRODUCT_DEACTIVATED", "admin", String.valueOf(productId)))
                .as("one row per operation, not one per advice")
                .isEqualTo(1);
    }

    @Test
    @DisplayName("only an ADMIN can read the audit trail through the API")
    void auditEndpointIsAdminOnly() throws Exception {
        String admin = login("admin", "admin123");
        String manager = login("manager", "manager123");

        String page = mvc.perform(get("/api/audit").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode content = json.readTree(page).get("content");
        assertThat(content.isArray()).isTrue();

        mvc.perform(get("/api/audit").header("Authorization", "Bearer " + manager))
                .andExpect(status().isForbidden());
    }
}
