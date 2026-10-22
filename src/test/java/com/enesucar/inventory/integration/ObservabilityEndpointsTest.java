package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.core.env.Environment;
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
 * The monitoring surface over real HTTP, because MockMvc cannot reach the separate management
 * port: Prometheus must be able to scrape {@code /actuator/prometheus}, and the latency histogram
 * behind the Grafana p99 panel must be present. A framework upgrade that silently drops either
 * would otherwise only be noticed on the dashboard.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "management.server.port=18081"
})
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("Observability endpoints")
class ObservabilityEndpointsTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired Environment env;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> get(String url) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create(url)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test
    @DisplayName("Prometheus scrape works and exposes JVM metrics plus the request latency histogram")
    void prometheusScrapeExposesMetrics() throws Exception {
        String appPort = env.getProperty("local.server.port");
        // One real request so that http.server.requests has something to report.
        get("http://localhost:" + appPort + "/api/auth/me");

        HttpResponse<String> scrape = get("http://localhost:18081/actuator/prometheus");

        assertThat(scrape.statusCode()).isEqualTo(200);
        assertThat(scrape.body()).contains("jvm_memory_used_bytes");
        assertThat(scrape.body()).contains("http_server_requests_seconds_bucket");
    }

    @Test
    @DisplayName("Health endpoint answers on the management port")
    void healthIsUp() throws Exception {
        HttpResponse<String> health = get("http://localhost:18081/actuator/health");

        assertThat(health.statusCode()).isEqualTo(200);
        assertThat(health.body()).contains("UP");
    }
}
