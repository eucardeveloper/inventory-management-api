package com.enesucar.inventory.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Set;

/**
 * CSRF defence for cookie authentication.
 *
 * <p>The JWT lives in an HttpOnly cookie and browsers attach cookies automatically, so
 * "stateless JWT" is not a reason to switch CSRF protection off. The layers are:
 * <ol>
 *   <li>SameSite=Strict cookies (see {@code CookieFactory});</li>
 *   <li>this filter: POST/PUT/PATCH/DELETE whose Origin (or, if absent, Referer) is not an
 *       allowed origin are rejected with 403;</li>
 *   <li>JSON-only request bodies: a cross-site HTML form cannot send them, and a cross-site
 *       script needs a CORS preflight that only allowed origins pass.</li>
 * </ol>
 * Requests with neither Origin nor Referer are non-browser clients (curl, server-to-server,
 * tests). A browser always sends Origin on cross-origin POSTs, so these cannot be forged CSRF.
 * Safe methods (GET/HEAD/OPTIONS) must stay free of side effects, which this API respects.
 */
@Component
public class OriginCheckFilter extends OncePerRequestFilter {

    private static final Set<String> STATE_CHANGING = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final List<String> allowedOrigins;

    public OriginCheckFilter(
            @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:3002}")
            List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (STATE_CHANGING.contains(request.getMethod())) {
            String origin = originOf(request);
            if (origin != null && !allowedOrigins.contains(origin)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/problem+json");
                response.getWriter().write(
                        "{\"type\":\"https://api.inventory.local/problems/origin-not-allowed\","
                        + "\"title\":\"Origin Not Allowed\",\"status\":403,"
                        + "\"detail\":\"Cross-site state-changing requests are not allowed.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    /** Origin header, or the origin derived from Referer; null when the client sent neither. */
    private static String originOf(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            return origin;
        }
        String referer = request.getHeader("Referer");
        if (referer == null || referer.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(referer);
            if (uri.getScheme() != null && uri.getHost() != null) {
                int port = uri.getPort();
                return uri.getScheme() + "://" + uri.getHost() + (port == -1 ? "" : ":" + port);
            }
        } catch (IllegalArgumentException ignored) {
            // fall through: an unparseable Referer is treated as a foreign origin
        }
        return "invalid-referer";
    }
}
