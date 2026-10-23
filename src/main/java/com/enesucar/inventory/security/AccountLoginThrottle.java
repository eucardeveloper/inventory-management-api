package com.enesucar.inventory.security;

import com.enesucar.inventory.exception.TooManyLoginAttemptsException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.function.LongSupplier;

/**
 * Limits sign-in attempts per account, on top of the per-address limit in
 * {@link com.enesucar.inventory.filter.LoginRateLimitFilter}: a guesser who owns many addresses can still
 * only try {@code app.login-rate-limit.account-max-attempts} passwords per window against one username.
 *
 * <p>Each attempt is counted <em>before</em> the password is checked and a successful sign-in clears the
 * counter, so parallel guesses cannot slip past a "check, then record" gap. Trade-off: a stranger who knows a
 * username can lock that account out for the rest of the window (the same property every lockout scheme has);
 * the window is short and the lock lifts by itself.
 *
 * <p>In memory, for a single instance, with the same bounded-LRU approach as the address limiter.
 */
@Component
public class AccountLoginThrottle {

    static final int MAX_ACCOUNTS = 10_000;

    private final int maxAttempts;
    private final long windowMillis;
    private final LongSupplier clock;
    private final Map<String, Deque<Long>> attempts = new LinkedHashMap<>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Deque<Long>> eldest) {
            return size() > MAX_ACCOUNTS;
        }
    };

    @Autowired
    public AccountLoginThrottle(
            @Value("${app.login-rate-limit.account-max-attempts:10}") int maxAttempts,
            @Value("${app.login-rate-limit.account-window-seconds:900}") long windowSeconds) {
        this(maxAttempts, windowSeconds * 1000L, System::currentTimeMillis);
    }

    AccountLoginThrottle(int maxAttempts, long windowMillis, LongSupplier clock) {
        this.maxAttempts = maxAttempts;
        this.windowMillis = windowMillis;
        this.clock = clock;
    }

    /** Counts one attempt for the account; throws when the account already used up its attempts in the window. */
    public void reserve(String username) {
        String key = key(username);
        long now = clock.getAsLong();
        synchronized (attempts) {
            Deque<Long> window = attempts.computeIfAbsent(key, k -> new ArrayDeque<>());
            while (!window.isEmpty() && now - window.peekFirst() >= windowMillis) {
                window.pollFirst();
            }
            if (window.size() >= maxAttempts) {
                long retry = Math.max(1, (window.peekFirst() + windowMillis - now + 999) / 1000);
                throw new TooManyLoginAttemptsException(retry);
            }
            window.addLast(now);
        }
    }

    /** A successful sign-in clears the account's counter. */
    public void reset(String username) {
        synchronized (attempts) {
            attempts.remove(key(username));
        }
    }

    private static String key(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }
}
