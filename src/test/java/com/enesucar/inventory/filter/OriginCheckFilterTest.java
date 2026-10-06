package com.enesucar.inventory.filter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OriginCheckFilter (CSRF defence for cookie auth)")
class OriginCheckFilterTest {

    private final OriginCheckFilter filter =
            new OriginCheckFilter(List.of("http://localhost:3000", "http://localhost:3002"));

    @Test
    @DisplayName("POST from a foreign Origin is rejected with 403 and never reaches the controller")
    void foreignOrigin_post_returns403() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/warehouse/movements");
        request.addHeader("Origin", "https://evil.example");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    @DisplayName("login is protected too (login CSRF)")
    void foreignOrigin_login_returns403() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.addHeader("Origin", "https://evil.example");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("POST from an allowed Origin passes")
    void allowedOrigin_post_passes() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/products");
        request.addHeader("Origin", "http://localhost:3000");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("without Origin the Referer is checked")
    void foreignReferer_delete_returns403() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/api/products/1");
        request.addHeader("Referer", "https://evil.example/page?x=1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("allowed Referer passes")
    void allowedReferer_put_passes() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("PUT", "/api/products/1");
        request.addHeader("Referer", "http://localhost:3002/products");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("requests with neither Origin nor Referer are non-browser clients and pass")
    void noOriginNoReferer_post_passes() throws Exception {
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(new MockHttpServletRequest("POST", "/api/products"), new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("safe methods are never blocked")
    void foreignOrigin_get_passes() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/products");
        request.addHeader("Origin", "https://evil.example");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
    }
}
