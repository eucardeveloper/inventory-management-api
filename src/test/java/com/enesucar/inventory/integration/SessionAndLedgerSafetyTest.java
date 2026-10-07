package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Two safety nets that a plain happy-path test would miss:
 * refresh-token rotation / reuse detection, and the ledger rules around receipts and reversals.
 * Runs the real filter chain against the real schema.
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
@DisplayName("Session rotation and ledger safety")
class SessionAndLedgerSafetyTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    private MvcResult loginAsAdmin() throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk()).andReturn();
    }

    private String refreshCookieOf(MvcResult result) {
        Cookie cookie = result.getResponse().getCookie("refresh_token");
        assertThat(cookie).as("refresh_token cookie").isNotNull();
        return cookie.getValue();
    }

    private MvcResult refreshWith(String rawToken) throws Exception {
        return mvc.perform(post("/api/auth/refresh").cookie(new Cookie("refresh_token", rawToken))).andReturn();
    }

    @Test
    @DisplayName("login answers with the username so the UI can show who is signed in")
    void loginReturnsUsername() throws Exception {
        JsonNode body = json.readTree(loginAsAdmin().getResponse().getContentAsString());
        assertThat(body.get("username").asText()).isEqualTo("admin");
        assertThat(body.get("role").asText()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("refresh rotates the token; replaying the old one revokes every session")
    void refreshRotationAndReuseDetection() throws Exception {
        String first = refreshCookieOf(loginAsAdmin());

        MvcResult rotated = refreshWith(first);
        assertThat(rotated.getResponse().getStatus()).isEqualTo(200);
        String second = refreshCookieOf(rotated);
        assertThat(second).isNotEqualTo(first);

        // The old token is now a stolen/replayed one: rejected ...
        assertThat(refreshWith(first).getResponse().getStatus()).isEqualTo(400);
        // ... and because it was reused, the legitimate newer token is revoked as well.
        assertThat(refreshWith(second).getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    @DisplayName("malformed or unknown refresh tokens are rejected without touching other sessions")
    void garbageRefreshTokensAreRejected() throws Exception {
        String valid = refreshCookieOf(loginAsAdmin());
        for (String garbage : new String[]{"abc", ".", "1.", ".x", "999999999.nope", "1.wrongsecret"}) {
            assertThat(refreshWith(garbage).getResponse().getStatus()).as(garbage).isEqualTo(400);
        }
        assertThat(refreshWith(valid).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("a receipt without unitCost is rejected instead of creating a zero-cost lot")
    void receiptWithoutCostIsRejected() throws Exception {
        String token = adminToken();
        Long productId = jdbc.queryForObject("SELECT id FROM product ORDER BY id LIMIT 1", Long.class);
        Integer lotsBefore = jdbc.queryForObject("SELECT COUNT(*) FROM stock_lot", Integer.class);

        mvc.perform(post("/api/warehouse/movements").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + productId + ",\"movementType\":\"IN\",\"quantity\":5}"))
                .andExpect(status().isBadRequest());

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM stock_lot", Integer.class)).isEqualTo(lotsBefore);
    }

    @Test
    @DisplayName("two simultaneous reversals of one movement: exactly one wins")
    void concurrentReversalsOfTheSameMovement() throws Exception {
        String token = adminToken();
        Long productId = jdbc.queryForObject("SELECT id FROM product ORDER BY id LIMIT 1", Long.class);

        MvcResult receipt = mvc.perform(post("/api/warehouse/movements").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + productId + ",\"movementType\":\"IN\",\"quantity\":3,\"unitCost\":12.50}"))
                .andExpect(status().isCreated()).andReturn();
        long movementId = json.readTree(receipt.getResponse().getContentAsString()).get("id").asLong();

        int threads = 2;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            Callable<Integer> call = () -> {
                start.await();
                return mvc.perform(post("/api/warehouse/movements/" + movementId + "/reverse")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"reasonCode\":\"TEST\"}"))
                        .andReturn().getResponse().getStatus();
            };
            results.add(pool.submit(call));
        }
        start.countDown();
        int created = 0;
        int conflicts = 0;
        for (Future<Integer> f : results) {
            int code = f.get();
            if (code == 201) created++;
            if (code == 409) conflicts++;
        }
        pool.shutdown();

        assertThat(created).as("reversals created").isEqualTo(1);
        assertThat(conflicts).as("rejected as already reversed").isEqualTo(1);
        Integer reversals = jdbc.queryForObject(
                "SELECT COUNT(*) FROM stock_movement WHERE reversal_of_id = ?", Integer.class, movementId);
        assertThat(reversals).isEqualTo(1);
    }

    private String adminToken() throws Exception {
        return json.readTree(loginAsAdmin().getResponse().getContentAsString()).get("token").asText();
    }
}
