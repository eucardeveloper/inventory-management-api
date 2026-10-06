package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * "Postman test": every business endpoint, called without a token, with a garbage token and with a
 * token of a role that is too weak. Runs the real filter chain against the real schema and demo
 * accounts (admin / staff), so it fails if a route is ever left open.
 */
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.locations=classpath:db/migration,classpath:db/demo",
        // this test logs in and registers many times from one address; the limiter has its own unit test
        "app.login-rate-limit.max-attempts=1000"
})
@AutoConfigureMockMvc
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("API authorization")
class ApiAuthorizationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    private static final String[][] PROTECTED = {
            {"GET", "/api/products"}, {"GET", "/api/products/1"}, {"GET", "/api/products/low-stock"},
            {"POST", "/api/products"}, {"PUT", "/api/products/1"}, {"DELETE", "/api/products/1"},
            {"GET", "/api/suppliers"}, {"POST", "/api/suppliers"}, {"PUT", "/api/suppliers/1"}, {"DELETE", "/api/suppliers/1"},
            {"GET", "/api/warehouse/movements"}, {"POST", "/api/warehouse/movements"},
            {"POST", "/api/warehouse/movements/1/reverse"}, {"GET", "/api/warehouse/report"},
            {"GET", "/api/audit"}, {"GET", "/api/users"}, {"GET", "/api/users/1"},
            {"PATCH", "/api/users/1/role"}, {"PATCH", "/api/users/1/password"}, {"DELETE", "/api/users/1"},
            {"POST", "/api/auth/register"},
    };

    private MockHttpServletRequestBuilder request(String method, String path) {
        return request(org.springframework.http.HttpMethod.valueOf(method), path)
                .contentType(MediaType.APPLICATION_JSON).content("{}");
    }

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode node = json.readTree(body);
        return node.get("token").asText();
    }

    @Test
    @DisplayName("no token: every protected endpoint answers 401")
    void anonymousIsRejectedEverywhere() throws Exception {
        for (String[] r : PROTECTED) {
            mvc.perform(request(r[0], r[1])).andExpect(status().isUnauthorized());
        }
    }

    @Test
    @DisplayName("garbage or tampered token: 401")
    void invalidTokenIsRejected() throws Exception {
        for (String token : new String[]{"abc", "eyJhbGciOiJIUzI1NiJ9.e30.invalid"}) {
            mvc.perform(get("/api/products").header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    @DisplayName("STAFF cannot manage data, users, audit log or create accounts: 403")
    void staffIsForbiddenFromPrivilegedRoutes() throws Exception {
        String staff = login("staff", "staff123");
        String[][] forbidden = {
                {"POST", "/api/products"}, {"PUT", "/api/products/1"}, {"DELETE", "/api/products/1"},
                {"POST", "/api/suppliers"}, {"DELETE", "/api/suppliers/1"},
                {"POST", "/api/warehouse/movements/1/reverse"},
                {"GET", "/api/audit"}, {"GET", "/api/users"}, {"PATCH", "/api/users/1/role"},
                {"DELETE", "/api/users/1"}, {"POST", "/api/auth/register"},
        };
        for (String[] r : forbidden) {
            mvc.perform(request(r[0], r[1]).header("Authorization", "Bearer " + staff))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    @DisplayName("self-registration as ADMIN is impossible; only an admin can create accounts")
    void onlyAdminCreatesAccounts() throws Exception {
        String payload = "{\"username\":\"mallory\",\"password\":\"password123\",\"role\":\"ADMIN\"}";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isUnauthorized());
        Integer created = jdbc.queryForObject("SELECT COUNT(*) FROM app_user WHERE username = 'mallory'", Integer.class);
        assertThat(created).isZero();

        String admin = login("admin", "admin123");
        mvc.perform(post("/api/auth/register").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/register").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("a token stops working once its user is deleted")
    void tokenOfDeletedUserIsRejected() throws Exception {
        String admin = login("admin", "admin123");
        mvc.perform(post("/api/auth/register").header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"temp.user\",\"password\":\"password123\",\"role\":\"STAFF\"}"))
                .andExpect(status().isOk());
        String temp = login("temp.user", "password123");
        mvc.perform(get("/api/products").header("Authorization", "Bearer " + temp)).andExpect(status().isOk());

        jdbc.update("DELETE FROM app_user WHERE username = 'temp.user'"); // refresh tokens cascade

        mvc.perform(get("/api/products").header("Authorization", "Bearer " + temp)).andExpect(status().isUnauthorized());
    }
}
