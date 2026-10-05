package com.enesucar.inventory.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoginRateLimiter {

    private final int maxAttempts;
    private final Duration window;
    private final Duration lockDuration;
    private final Clock clock;
    private final Map<Key, AttemptState> attempts = new ConcurrentHashMap<>();

    @Autowired
    public LoginRateLimiter(
            @Value("${security.login.rate-limit.max-attempts:5}") int maxAttempts,
            @Value("${security.login.rate-limit.window-seconds:60}") long windowSeconds,
            @Value("${security.login.rate-limit.lock-seconds:300}") long lockSeconds) {
        this(maxAttempts, Duration.ofSeconds(windowSeconds), Duration.ofSeconds(lockSeconds),
                Clock.systemUTC());
    }

    public LoginRateLimiter(int maxAttempts, Duration window, Duration lockDuration, Clock clock) {
        if (maxAttempts < 1 || window.isNegative() || window.isZero()
                || lockDuration.isNegative() || lockDuration.isZero()) {
            throw new IllegalArgumentException("Login rate-limit settings must be positive");
        }
        this.maxAttempts = maxAttempts;
        this.window = window;
        this.lockDuration = lockDuration;
        this.clock = clock;
    }

    public void checkAllowed(String username, String ipAddress) {
        Key key = new Key(username, ipAddress);
        AttemptState state = attempts.get(key);
        if (state == null) {
            return;
        }
        synchronized (state) {
            Instant now = clock.instant();
            if (state.lockedUntil != null && now.isBefore(state.lockedUntil)) {
                throw new LoginRateLimitExceededException();
            }
            if (state.firstFailure != null && !now.isBefore(state.firstFailure.plus(window))) {
                attempts.remove(key, state);
            }
        }
    }

    public void recordFailure(String username, String ipAddress) {
        Key key = new Key(username, ipAddress);
        AttemptState state = attempts.computeIfAbsent(key, ignored -> new AttemptState());
        synchronized (state) {
            Instant now = clock.instant();
            if (state.firstFailure == null || !now.isBefore(state.firstFailure.plus(window))) {
                state.firstFailure = now;
                state.failures = 0;
                state.lockedUntil = null;
            }
            state.failures++;
            if (state.failures >= maxAttempts) {
                state.lockedUntil = now.plus(lockDuration);
            }
        }
    }

    public void recordSuccess(String username, String ipAddress) {
        attempts.remove(new Key(username, ipAddress));
    }

    private record Key(String username, String ipAddress) {}

    private static final class AttemptState {
        private Instant firstFailure;
        private Instant lockedUntil;
        private int failures;
    }
}
