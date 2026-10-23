package com.enesucar.inventory.security;

import com.enesucar.inventory.exception.TooManyLoginAttemptsException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("AccountLoginThrottle")
class AccountLoginThrottleTest {

    private final AtomicLong now = new AtomicLong(1_000_000L);

    private AccountLoginThrottle throttle(int max) {
        return new AccountLoginThrottle(max, 60_000L, now::get);
    }

    @Test
    @DisplayName("the attempt above the limit is refused, with the time until the oldest one ages out")
    void refusesAboveTheLimit() {
        AccountLoginThrottle t = throttle(3);
        for (int i = 0; i < 3; i++) {
            t.reserve("anna");
            now.addAndGet(1_000);
        }
        assertThatThrownBy(() -> t.reserve("anna"))
                .isInstanceOfSatisfying(TooManyLoginAttemptsException.class,
                        e -> assertThat(e.getRetryAfterSeconds()).isBetween(55L, 58L));
    }

    @Test
    @DisplayName("usernames are separate and case-insensitive")
    void accountsAreSeparate() {
        AccountLoginThrottle t = throttle(2);
        t.reserve("Anna");
        t.reserve(" anna ");
        assertThatThrownBy(() -> t.reserve("ANNA")).isInstanceOf(TooManyLoginAttemptsException.class);
        assertThatCode(() -> t.reserve("ben")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("a successful sign-in clears the counter")
    void successClearsTheCounter() {
        AccountLoginThrottle t = throttle(2);
        t.reserve("anna");
        t.reserve("anna");
        t.reset("anna");
        assertThatCode(() -> t.reserve("anna")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("attempts age out of the window")
    void attemptsAgeOut() {
        AccountLoginThrottle t = throttle(2);
        t.reserve("anna");
        t.reserve("anna");
        now.addAndGet(60_000);
        assertThatCode(() -> t.reserve("anna")).doesNotThrowAnyException();
    }
}
