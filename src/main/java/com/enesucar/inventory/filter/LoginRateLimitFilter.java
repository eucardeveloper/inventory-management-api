package com.enesucar.inventory.filter;

import com.enesucar.inventory.exception.ProblemJson;
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
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.LongSupplier;

/**
 * Throttles credential endpoints (login, register) per client address: at most
 * {@code app.login-rate-limit.max-attempts} requests per window, default 10 per minute.
 *
 * <p>BCrypt makes each guess slow for the attacker's target, but without a limit a single
 * client can still try unlimited passwords against known usernames. This is a deliberately
 * small in-memory limiter for a single instance; behind several instances a shared store or an
 * API gateway would take over. No extra dependency is needed for it.
 *
 * <p><b>Bounded memory.</b> The state is one small queue per client address. To keep a flood of
 * distinct addresses from growing the map without limit, it is an access-ordered LRU map capped at
 * {@code app.login-rate-limit.max-clients} entries (default 10 000): when the cap is reached the
 * least recently seen client is forgotten, and expired entries are swept out once per window.
 */
@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    static final int DEFAULT_MAX_CLIENTS = 10_000;

    private final int maxAttempts;
    private final long windowMillis;
    private final LongSupplier clock;
    private final Map<String, Deque<Long>> attempts;
    private long lastSweep;

    @Autowired
    public LoginRateLimitFilter(
            @Value("${app.login-rate-limit.max-attempts:10}") int maxAttempts,
            @Value("${app.login-rate-limit.window-seconds:60}") long windowSeconds,
            @Value("${app.login-rate-limit.max-clients:" + DEFAULT_MAX_CLIENTS + "}") int maxClients) {
        this(maxAttempts, windowSeconds * 1000L, System::currentTimeMillis, maxClients);
    }

    /** Test constructor with an injectable clock. */
    LoginRateLimitFilter(int maxAttempts, long windowMillis, LongSupplier clock) {
        this(maxAttempts, windowMillis, clock, DEFAULT_MAX_CLIENTS);
    }

    /** Test constructor with an injectable clock and client cap. */
    LoginRateLimitFilter(int maxAttempts, long windowMillis, LongSupplier clock, int maxClients) {
        this.maxAttempts = maxAttempts;
        this.windowMillis = windowMillis;
        this.clock = clock;
        this.attempts = boundedMap(Math.max(1, maxClients));
        this.lastSweep = clock.getAsLong();
    }

    private static Map<String, Deque<Long>> boundedMap(int maxClients) {
        return new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Deque<Long>> eldest) {
                return size() > maxClients;
            }
        };
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
            response.setHeader("Retry-After", String.valueOf(Math.max(1, windowMillis / 1000)));
            ProblemJson.write(response, 429, "Too Many Requests",
                    "Too many attempts. Please wait a minute and try again.", "too-many-requests");
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean tooManyAttempts(String client) {
        long now = clock.getAsLong();
        // One short critical section per login attempt; the map is an LRU and not thread-safe.
        synchronized (attempts) {
            sweepExpired(now);
            Deque<Long> window = attempts.computeIfAbsent(client, k -> new ArrayDeque<>());
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

    /** Drops clients whose newest attempt is older than the window. Runs at most once per window. */
    private void sweepExpired(long now) {
        if (now - lastSweep < windowMillis) {
            return;
        }
        lastSweep = now;
        attempts.values().removeIf(w -> w.isEmpty() || now - w.peekLast() >= windowMillis);
    }

    /** Number of client addresses currently tracked (visible for tests). */
    int trackedClients() {
        synchronized (attempts) {
            return attempts.size();
        }
    }
}
