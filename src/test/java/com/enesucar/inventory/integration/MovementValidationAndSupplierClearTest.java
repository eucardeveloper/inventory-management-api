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

    // ---- Finding 1: lost update on product edit ------------------------------------------

    private JsonNode getProduct(String token, long id) throws Exception {
        String body = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/products/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body);
    }

    private org.springframework.test.web.servlet.ResultActions putProduct(String token, long id, String body) throws Exception {
        return mvc.perform(put("/api/products/" + id).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("an edit made from a stale version is refused with 409 and does not overwrite the newer save")
    void staleVersionIsRejected() throws Exception {
        String token = login();
        long productId = newProduct(token, null);
        long openedVersion = getProduct(token, productId).get("version").asLong(); // both editors read this

        putProduct(token, productId, "{\"name\":\"first editor\",\"version\":" + openedVersion + "}")
                .andExpect(status().isOk());

        putProduct(token, productId, "{\"name\":\"second editor\",\"version\":" + openedVersion + "}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.type").value(org.hamcrest.Matchers.endsWith("concurrent-modification")));

        assertThat(getProduct(token, productId).get("name").asText()).isEqualTo("first editor");
    }

    @Test
    @DisplayName("the supplied version is only a precondition: it is never written, the new version is the server's")
    void currentVersionIsAcceptedAndNotWritten() throws Exception {
        String token = login();
        long productId = newProduct(token, null);
        long version = getProduct(token, productId).get("version").asLong();

        String updated = putProduct(token, productId, "{\"name\":\"edited\",\"version\":" + version + "}")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertThat(json.readTree(updated).get("version").asLong()).isEqualTo(version + 1);
    }

    @Test
    @DisplayName("without a version the update behaves as before (no precondition)")
    void missingVersionKeepsOldBehaviour() throws Exception {
        String token = login();
        long productId = newProduct(token, null);

        putProduct(token, productId, "{\"name\":\"one\"}").andExpect(status().isOk());
        putProduct(token, productId, "{\"name\":\"two\"}").andExpect(status().isOk());
    }

    @Test
    @DisplayName("a stock movement between opening and saving also changes the version, so the edit gets 409 (documented trade-off)")
    void stockMovementDuringEditConflicts() throws Exception {
        String token = login();
        long productId = newProduct(token, null);
        long openedVersion = getProduct(token, productId).get("version").asLong();

        mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(movement(productId, "IN", 5, "2", null)))
                .andExpect(status().isCreated());

        putProduct(token, productId, "{\"name\":\"late editor\",\"version\":" + openedVersion + "}")
                .andExpect(status().isConflict());
    }

    // ---- Finding 4: the same idempotency key on two different products at the same moment ----

    @Test
    @DisplayName("one key used for two different products at once: one booking, the other request is 422 (never 409)")
    void sameKeyOnTwoProductsConcurrentlyIsKeyReuse() throws Exception {
        String token = login();
        long productA = newProduct(token, null);
        long productB = newProduct(token, null);
        java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        java.util.List<String> outcomes = new java.util.ArrayList<>();
        try {
            for (int round = 0; round < 40; round++) {
                String key = UUID.randomUUID().toString();
                java.util.concurrent.CountDownLatch gate = new java.util.concurrent.CountDownLatch(1);
                java.util.List<java.util.concurrent.Future<Integer>> calls = new java.util.ArrayList<>();
                for (long productId : new long[]{productA, productB}) {
                    calls.add(pool.submit(() -> {
                        gate.await();
                        return mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + token)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(movement(productId, "IN", 1, "1", key)))
                                .andReturn().getResponse().getStatus();
                    }));
                }
                gate.countDown();
                java.util.List<Integer> statuses = new java.util.ArrayList<>();
                for (var call : calls) {
                    statuses.add(call.get(30, java.util.concurrent.TimeUnit.SECONDS));
                }
                java.util.Collections.sort(statuses);
                outcomes.add(statuses.toString());
                assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM stock_movement WHERE idempotency_key = ?",
                        Integer.class, key)).as("movements booked under the key").isEqualTo(1);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(outcomes).as("status pairs of the 40 rounds").allMatch(pair -> pair.equals("[201, 422]"));
    }
}
