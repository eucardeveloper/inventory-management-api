package com.enesucar.inventory.integration;

import com.enesucar.inventory.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Verifies refresh-token rotation at the HTTP boundary against PostgreSQL.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConcurrentRefreshTokenTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void oneOfTwoParallelRefreshRequestsSucceedsAndTheOtherIsRejected() throws Exception {
        String username = "refresh-test-" + UUID.randomUUID();
        var login = mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username
                                + "\",\"password\":\"refresh-password\",\"role\":\"ADMIN\"}"))
                .andReturn()
                .getResponse();

        assertThat(login.getStatus()).isEqualTo(200);
        var refreshCookie = login.getCookie(AuthService.REFRESH_COOKIE);
        assertThat(refreshCookie).isNotNull();

        int requests = 2;
        ExecutorService pool = Executors.newFixedThreadPool(requests);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        for (int i = 0; i < requests; i++) {
            results.add(pool.submit(() -> {
                start.await();
                return mvc.perform(post("/api/auth/refresh")
                                .cookie(new MockCookie(
                                        AuthService.REFRESH_COOKIE, refreshCookie.getValue())))
                        .andReturn()
                        .getResponse()
                        .getStatus();
            }));
        }

        start.countDown();
        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> result : results) {
            statuses.add(result.get());
        }
        pool.shutdown();

        assertThat(statuses).containsExactlyInAnyOrder(200, 400);
    }
}
