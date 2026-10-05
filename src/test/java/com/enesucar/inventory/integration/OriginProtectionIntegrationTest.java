package com.enesucar.inventory.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OriginProtectionIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void disallowedOriginCannotSubmitStateChangingRequest() throws Exception {
        String body = "{\"username\":\"origin-" + UUID.randomUUID()
                + "\",\"password\":\"valid-password\",\"role\":\"STAFF\"}";

        mvc.perform(post("/api/auth/register")
                        .header("Origin", "https://evil.example")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void configuredFrontendOriginCanSubmitStateChangingRequest() throws Exception {
        String body = "{\"username\":\"origin-" + UUID.randomUUID()
                + "\",\"password\":\"valid-password\",\"role\":\"STAFF\"}";

        mvc.perform(post("/api/auth/register")
                        .header("Origin", "http://localhost:3002")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }
}
