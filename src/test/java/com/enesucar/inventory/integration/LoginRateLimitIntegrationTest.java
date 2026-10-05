package com.enesucar.inventory.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "security.login.rate-limit.max-attempts=2",
        "security.login.rate-limit.window-seconds=60",
        "security.login.rate-limit.lock-seconds=60"
})
class LoginRateLimitIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void repeatedFailuresAreLockedWithoutRevealingWhetherUserExists() throws Exception {
        String username = "rate-limit-" + UUID.randomUUID();
        String body = "{\"username\":\"" + username + "\",\"password\":\"valid-password\",\"role\":\"STAFF\"}";
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        String invalid = "{\"username\":\"" + username + "\",\"password\":\"wrong-password\"}";
        mvc.perform(post("/api/auth/login").with(request -> {
                    request.setRemoteAddr("192.0.2.10");
                    return request;
                }).contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid username or password"));
        mvc.perform(post("/api/auth/login").with(request -> {
                    request.setRemoteAddr("192.0.2.10");
                    return request;
                }).contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(request -> {
                    request.setRemoteAddr("192.0.2.10");
                    return request;
                }).contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isLocked())
                .andExpect(jsonPath("$.detail").value("Too many login attempts. Try again later."));
    }

    @Test
    void successfulLoginResetsTheCounter() throws Exception {
        String username = "rate-reset-" + UUID.randomUUID();
        String valid = "{\"username\":\"" + username + "\",\"password\":\"valid-password\",\"role\":\"STAFF\"}";
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(valid))
                .andExpect(status().isOk());

        String invalid = "{\"username\":\"" + username + "\",\"password\":\"wrong-password\"}";
        mvc.perform(post("/api/auth/login").with(request -> {
                    request.setRemoteAddr("192.0.2.11");
                    return request;
                }).contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(request -> {
                    request.setRemoteAddr("192.0.2.11");
                    return request;
                }).contentType(MediaType.APPLICATION_JSON).content(valid))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").with(request -> {
                    request.setRemoteAddr("192.0.2.11");
                    return request;
                }).contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isUnauthorized());
    }
}
