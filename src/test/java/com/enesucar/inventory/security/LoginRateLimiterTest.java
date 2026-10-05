package com.enesucar.inventory.security;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

class LoginRateLimiterTest {

    @Test
    void locksAfterConfiguredFailuresAndUnlocksAfterTheLockPeriod() {
        Instant start = Instant.parse("2026-10-05T08:00:00Z");
        MutableClock clock = new MutableClock(start);
        LoginRateLimiter limiter = new LoginRateLimiter(2, Duration.ofMinutes(1),
                Duration.ofMinutes(5), clock);

        limiter.checkAllowed("alice", "10.0.0.1");
        limiter.recordFailure("alice", "10.0.0.1");
        limiter.recordFailure("alice", "10.0.0.1");

        assertThatThrownBy(() -> limiter.checkAllowed("alice", "10.0.0.1"))
                .isInstanceOf(LoginRateLimitExceededException.class);

        clock.advance(Duration.ofMinutes(5));
        assertThatCode(() -> limiter.checkAllowed("alice", "10.0.0.1"))
                .doesNotThrowAnyException();
    }

    @Test
    void successfulLoginResetsOnlyTheMatchingUserAndIp() {
        MutableClock clock = new MutableClock(Instant.parse("2026-10-05T08:00:00Z"));
        LoginRateLimiter limiter = new LoginRateLimiter(2, Duration.ofMinutes(1),
                Duration.ofMinutes(5), clock);

        limiter.recordFailure("alice", "10.0.0.1");
        limiter.recordFailure("alice", "10.0.0.1");
        limiter.recordFailure("alice", "10.0.0.2");
        limiter.recordFailure("alice", "10.0.0.2");
        limiter.recordSuccess("alice", "10.0.0.1");

        assertThatCode(() -> limiter.checkAllowed("alice", "10.0.0.1"))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> limiter.checkAllowed("alice", "10.0.0.2"))
                .isInstanceOf(LoginRateLimitExceededException.class);
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
