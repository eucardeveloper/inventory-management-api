package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * A retried booking is answered with the original movement, not with an error: a client that
 * timed out must not be able to tell the retry from a first call. Nothing may be booked twice.
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
@DisplayName("idempotent replay")
class IdempotentReplayTest {

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

    private static String body(long productId, int quantity, String key) {
        return "{\"productId\":" + productId + ",\"movementType\":\"OUT\",\"quantity\":" + quantity
                + ",\"idempotencyKey\":\"" + key + "\"}";
    }

    @Test
    @DisplayName("the same request under the same key returns the original movement and books nothing more")
    void retryReturnsTheOriginal() throws Exception {
        String staff = login("staff", "staff123");
        Long productId = jdbc.queryForObject("SELECT id FROM product WHERE stock > 5 ORDER BY id LIMIT 1", Long.class);
        String key = UUID.randomUUID().toString();

        String first = mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + staff)
                        .contentType(MediaType.APPLICATION_JSON).content(body(productId, 1, key)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Integer stockAfterFirst = jdbc.queryForObject("SELECT stock FROM product WHERE id = ?", Integer.class, productId);

        String retry = mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + staff)
                        .contentType(MediaType.APPLICATION_JSON).content(body(productId, 1, key)))
                .andExpect(status().isOk())
                .andExpect(header().string("Idempotent-Replayed", "true"))
                .andReturn().getResponse().getContentAsString();

        assertThat(json.readTree(retry).get("id")).isEqualTo(json.readTree(first).get("id"));
        assertThat(jdbc.queryForObject("SELECT stock FROM product WHERE id = ?", Integer.class, productId))
                .as("the retry must not take the stock down a second time").isEqualTo(stockAfterFirst);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM stock_movement WHERE idempotency_key = ?",
                Integer.class, key)).isEqualTo(1);
    }

    @Test
    @DisplayName("a different request, or another user, under the same key is refused and learns nothing")
    void differentRequestIsRefused() throws Exception {
        String staff = login("staff", "staff123");
        String manager = login("manager", "manager123");
        Long productId = jdbc.queryForObject("SELECT id FROM product WHERE stock > 5 ORDER BY id LIMIT 1", Long.class);
        String key = UUID.randomUUID().toString();

        mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + staff)
                        .contentType(MediaType.APPLICATION_JSON).content(body(productId, 1, key)))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + staff)
                        .contentType(MediaType.APPLICATION_JSON).content(body(productId, 2, key)))
                .andExpect(status().isUnprocessableEntity());

        mvc.perform(post("/api/stock/movements").header("Authorization", "Bearer " + manager)
                        .contentType(MediaType.APPLICATION_JSON).content(body(productId, 1, key)))
                .andExpect(status().isUnprocessableEntity());
    }
}
