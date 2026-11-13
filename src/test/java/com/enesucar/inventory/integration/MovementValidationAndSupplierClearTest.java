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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Findings of the independent review of 2026-11-13, each reproduced against the running stack first:
 *
 * <ul>
 *   <li>An idempotency key longer than the column, and a total cost beyond NUMERIC(19,4), were answered
 *       with 409 "Duplicate Movement" although nothing had been booked: a client would believe its
 *       movement stands. Both are input errors and must be 400.</li>
 *   <li>A product's supplier could not be removed: {@code "supplier": null} means "unchanged" in the
 *       partial update, and there was no way to say "none". {@code {"supplier": {"id": null}}} now does.</li>
 * </ul>
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
@DisplayName("movement input limits and clearing a product's supplier")
class MovementValidationAndSupplierClearTest {

    private static final String MAX_UNIT_COST = "999999999999999"; // 15 integer digits, the DTO limit

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    final ObjectMapper json = new ObjectMapper();

    private String login() throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"manager\",\"password\":\"manager123\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    private long newProduct(String token, Long supplierId) throws Exception {
        String uid = UUID.randomUUID().toString();
        String supplier = supplierId == null ? "" : ",\"supplier\":{\"id\":" + supplierId + "}";
        String body = mvc.perform(post("/api/products").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Review " + uid + "\",\"articleNumber\":\"RV-" + uid + "\",\"active\":true" + supplier + "}"))
                .andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private static String movement(long productId, String type, int quantity, String unitCost, String key) {
        return "{\"productId\":" + productId + ",\"movementType\":\"" + type + "\",\"quantity\":" + quantity
                + (unitCost == null ? "" : ",\"unitCost\":" + unitCost)
                + (key == null ? "" : ",\"idempotencyKey\":\"" + key + "\"") + "}";
    }

    private int movementsOf(long productId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM stock_movement WHERE product_id = ?", Integer.class, productId);
    }

    private int lotsOf(long productId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM stock_lot WHERE product_id = ?", Integer.class, productId);
    }

    @Test
    @DisplayName("an idempotency key longer than 100 characters is a validation error, not a duplicate")
    void oversizedKeyIsRejectedAsInvalid() throws Exception {
        String token = login();
        long productId = newProduct(token, null);

        mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(movement(productId, "IN", 1, "1", "k".repeat(101))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.idempotencyKey").exists());

        assertThat(movementsOf(productId)).isZero();
        assertThat(lotsOf(productId)).isZero();
    }

    @Test
    @DisplayName("a receipt whose total cost does not fit the ledger is 400 with and without a key, and books nothing")
    void receiptCostOverflowIsRejectedAsInvalid() throws Exception {
        String token = login();
        long productId = newProduct(token, null);

        for (String key : new String[]{UUID.randomUUID().toString(), null}) {
            mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(movement(productId, "IN", 1_000_000, MAX_UNIT_COST, key)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.type").value(org.hamcrest.Matchers.endsWith("invalid-argument")));
        }

        assertThat(movementsOf(productId)).isZero();
        assertThat(lotsOf(productId)).as("the lot of a refused receipt must not stay behind").isZero();
    }

    @Test
    @DisplayName("an issue whose FIFO cost does not fit the ledger is 400 and leaves the lots untouched")
    void issueCostOverflowIsRejectedAsInvalid() throws Exception {
        String token = login();
        long productId = newProduct(token, null);
        for (int i = 0; i < 2; i++) { // each receipt fits on its own; together they do not
            mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(movement(productId, "IN", 1, MAX_UNIT_COST, null)))
                    .andExpect(status().isCreated());
        }

        mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(movement(productId, "OUT", 2, null, UUID.randomUUID().toString())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value(org.hamcrest.Matchers.endsWith("invalid-argument")));

        assertThat(movementsOf(productId)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COALESCE(SUM(remaining_quantity), 0) FROM stock_lot WHERE product_id = ?",
                Integer.class, productId)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT stock FROM product WHERE id = ?", Integer.class, productId)).isEqualTo(2);
    }

    @Test
    @DisplayName("supplier {id: null} removes the supplier; an absent supplier leaves it unchanged")
    void supplierCanBeCleared() throws Exception {
        String token = login();
        Long supplierId = jdbc.queryForObject("SELECT id FROM supplier ORDER BY id LIMIT 1", Long.class);
        long productId = newProduct(token, supplierId);

        // absent: unchanged (the partial-update contract the UI relies on for {"active": false})
        mvc.perform(put("/api/products/" + productId).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"description\":\"still has a supplier\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supplier.id").value(supplierId));

        // explicit "none"
        String cleared = mvc.perform(put("/api/products/" + productId).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"supplier\":{\"id\":null}}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode supplier = json.readTree(cleared).get("supplier");
        assertThat(supplier == null || supplier.isNull()).as("supplier in the response").isTrue();
        assertThat(jdbc.queryForObject("SELECT supplier_id FROM product WHERE id = ?", Long.class, productId)).isNull();
    }
}
