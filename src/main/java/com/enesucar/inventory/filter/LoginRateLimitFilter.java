package com.enesucar.inventory.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

/**
 * Throttles credential endpoints (login, register) per client address: at most
 * {@code app.login-rate-limit.max-attempts} requests per window, default 10 per minute.
 *
 * <p>BCrypt makes each guess slow for the attacker's target, but without a limit a single
 * client can still try unlimited passwords against known usernames. This is a deliberately
 * small in-memory limiter for a single instance; behind several instances a shared store or an
 * API gateway would take over. No extra dependency is needed for it.
 */
@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private final int maxAttempts;
    private final long windowMillis;
    private final LongSupplier clock;
    private final Map<String, Deque<Long>> attempts = new ConcurrentHashMap<>();

    @Autowired
    public LoginRateLimitFilter(
            @Value("${app.login-rate-limit.max-attempts:10}") int maxAttempts,
            @Value("${app.login-rate-limit.window-seconds:60}") long windowSeconds) {
        this(maxAttempts, windowSeconds * 1000L, System::currentTimeMillis);
    }

    /** Test constructor with an injectable clock. */
    LoginRateLimitFilter(int maxAttempts, long windowMillis, LongSupplier clock) {
        this.maxAttempts = maxAttempts;
        this.windowMillis = windowMillis;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        boolean credentialEndpoint = "/api/auth/login".equals(uri) || "/api/auth/register".equals(uri);
        return !"POST".equals(request.getMethod()) || !credentialEndpoint;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (tooManyAttempts(request.getRemoteAddr())) {
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(Math.max(1, windowMillis / 1000)));
            response.setContentType("application/problem+json");
            response.getWriter().write(
                    "{\"type\":\"https://api.inventory.local/problems/too-many-requests\","
                    + "\"title\":\"Too Many Requests\",\"status\":429,"
                    + "\"detail\":\"Too many attempts. Please wait a minute and try again.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean tooManyAttempts(String client) {
        long now = clock.getAsLong();
        Deque<Long> window = attempts.computeIfAbsent(client, k -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() >= windowMillis) {
                window.pollFirst();
            }
            if (window.size() >= maxAttempts) {
                return true;
            }
            window.addLast(now);
            return false;
        }
    }
}
