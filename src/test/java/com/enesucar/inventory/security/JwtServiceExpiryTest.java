package com.enesucar.inventory.security;

import com.enesucar.inventory.service.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JwtService access token lifetime")
class JwtServiceExpiryTest {

    private static final String SECRET = "jwt-expiry-test-secret-key-minimum-256-bits-long-ok";

    private static JwtService service() {
        JwtService s = new JwtService();
        ReflectionTestUtils.setField(s, "secretKey", SECRET);
        return s;
    }

    private static Date expiry(JwtService s, String token) {
        return ReflectionTestUtils.invokeMethod(s, "extractExpiration", token);
    }

    @Test
    @DisplayName("defaults to 15 minutes, not a day")
    void defaultsToFifteenMinutes() {
        JwtService s = service();
        String token = s.generateToken("alice", "ADMIN");

        long millis = expiry(s, token).getTime() - new Date().getTime();

        assertThat(millis).isBetween(14 * 60_000L, 15 * 60_000L + 5_000L);
    }

    @Test
    @DisplayName("follows jwt.access-token.expiry-minutes")
    void followsConfiguredMinutes() {
        JwtService s = service();
        ReflectionTestUtils.setField(s, "accessTokenMinutes", 5L);
        String token = s.generateToken("alice", "ADMIN");

        long millis = expiry(s, token).getTime() - new Date().getTime();

        assertThat(millis).isBetween(4 * 60_000L, 5 * 60_000L + 5_000L);
    }
}
