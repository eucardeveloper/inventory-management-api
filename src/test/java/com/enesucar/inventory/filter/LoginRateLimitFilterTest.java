package com.enesucar.inventory.filter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LoginRateLimitFilter")
class LoginRateLimitFilterTest {

    private final AtomicLong now = new AtomicLong(1_000_000L);
    private final LoginRateLimitFilter filter = new LoginRateLimitFilter(3, 60_000L, now::get);

    private MockHttpServletResponse loginFrom(String ip) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr(ip);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    @Test
    @DisplayName("the 4th attempt within the window is answered with 429")
    void blocksAfterLimit() throws Exception {
        assertThat(loginFrom("10.0.0.1").getStatus()).isEqualTo(200);
        assertThat(loginFrom("10.0.0.1").getStatus()).isEqualTo(200);
        assertThat(loginFrom("10.0.0.1").getStatus()).isEqualTo(200);

        MockHttpServletResponse blocked = loginFrom("10.0.0.1");

        assertThat(blocked.getStatus()).isEqualTo(429);
        assertThat(blocked.getHeader("Retry-After")).isEqualTo("60");
    }

    @Test
    @DisplayName("another client address is not affected")
    void limitIsPerClient() throws Exception {
        for (int i = 0; i < 3; i++) {
            loginFrom("10.0.0.1");
        }

        assertThat(loginFrom("10.0.0.2").getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("after the window the client may try again")
    void windowExpires() throws Exception {
        for (int i = 0; i < 3; i++) {
            loginFrom("10.0.0.1");
        }
        assertThat(loginFrom("10.0.0.1").getStatus()).isEqualTo(429);

        now.addAndGet(61_000L);

        assertThat(loginFrom("10.0.0.1").getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("other endpoints are not throttled")
    void otherEndpointsIgnored() throws Exception {
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/products");
            request.setRemoteAddr("10.0.0.1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertThat(response.getStatus()).isEqualTo(200);
        }
    }

    @Test
    @DisplayName("the 429 answer is a problem+json body")
    void blockedAnswerIsProblemJson() throws Exception {
        for (int i = 0; i < 3; i++) {
            loginFrom("10.0.0.1");
        }

        MockHttpServletResponse blocked = loginFrom("10.0.0.1");

        assertThat(blocked.getContentType()).startsWith("application/problem+json");
        assertThat(blocked.getContentAsString()).contains("\"status\":429").contains("\"title\":\"Too Many Requests\"");
    }

    @Test
    @DisplayName("memory is bounded: the least recently seen client is evicted when the cap is reached")
    void trackedClientsAreBounded() throws Exception {
        LoginRateLimitFilter small = new LoginRateLimitFilter(3, 60_000L, now::get, 2);
        for (String ip : new String[]{"10.0.0.1", "10.0.0.2", "10.0.0.3", "10.0.0.4"}) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr(ip);
            small.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
        }

        assertThat(small.trackedClients()).isEqualTo(2);
    }

    @Test
    @DisplayName("expired clients are swept out once the window has passed")
    void expiredClientsAreSwept() throws Exception {
        for (String ip : new String[]{"10.0.0.1", "10.0.0.2", "10.0.0.3"}) {
            loginFrom(ip);
        }
        assertThat(filter.trackedClients()).isEqualTo(3);

        now.addAndGet(61_000L);
        loginFrom("10.0.0.9");

        assertThat(filter.trackedClients()).isEqualTo(1);
    }
}
