package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs on a real embedded server (MockMvc would skip the servlet container's forwarded-header handling):
 * a caller that sends a different {@code X-Forwarded-For} on every attempt must still hit the login limit.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.flyway.locations=classpath:db/migration,classpath:db/demo",
        "app.login-rate-limit.max-attempts=3"
})
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("Login rate limit and X-Forwarded-For")
class LoginRateLimitForwardedHeaderTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Value("${local.server.port}") int port;

    @Test
    @DisplayName("a forged X-Forwarded-For does not give a caller a fresh login allowance")
    void forgedForwardedForDoesNotResetTheLimit() throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        int tooMany = 0;
        for (int i = 0; i < 8; i++) {
            HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login"))
                    .header("Content-Type", "application/json")
                    .header("X-Forwarded-For", "203.0.113." + (i + 1))
                    .POST(HttpRequest.BodyPublishers.ofString("{\"username\":\"nobody\",\"password\":\"wrong-password\"}"))
                    .build();
            if (client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode() == 429) {
                tooMany++;
            }
        }
        assertThat(tooMany).as("attempts answered 429 although every one claimed another address").isGreaterThan(0);
    }
}
