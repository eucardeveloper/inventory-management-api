package com.enesucar.inventory.service;

import com.enesucar.inventory.entity.RefreshToken;
import com.enesucar.inventory.entity.User;
import com.enesucar.inventory.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Manages opaque refresh tokens.
 *
 * <p>The value handed to the browser is {@code "<id>.<secret>"}. The id lets the server load
 * exactly one row (no table scan); the secret is 256 random bits, and only its SHA-256 hash is
 * stored, so a database leak cannot be replayed. SHA-256 is enough here because the secret is
 * random and long, unlike a human password.
 *
 * <p>Rotation: every successful refresh revokes the presented token and issues a new one.
 * Reuse detection: presenting a token that was already revoked means two parties hold it, so every
 * token of that user is revoked and both must log in again.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final int SECRET_BYTES = 32;   // 256 bits
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh-token.expiry-days:7}")
    private int expiryDays;

    /** Who a valid refresh token belongs to, copied out so no lazy entity leaves the transaction. */
    public record Owner(Long userId, String username, String role) {}

    /** Result of a successful rotation: the owner plus the replacement raw token. */
    public record Rotation(Owner owner, String newRawToken) {}

    // ── Create ──────────────────────────────────────────────────────────────

    /** Creates a token for {@code user} and returns the raw value for the HttpOnly cookie. */
    @Transactional
    public String createRefreshToken(User user) {
        String secret = newSecret();

        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setTokenHash(sha256(secret));
        rt.setExpiresAt(Instant.now().plus(expiryDays, ChronoUnit.DAYS));
        rt.setRevoked(false);
        rt = refreshTokenRepository.saveAndFlush(rt);

        return rt.getId() + "." + secret;
    }

    // ── Rotate ──────────────────────────────────────────────────────────────

    /**
     * Validates the presented token, revokes it and issues a replacement.
     *
     * <p>Runs in its own transaction on purpose: when reuse is detected the revocation of all
     * sessions must be committed even though the caller then rejects the request.
     *
     * @return the owner and the new raw token, or {@code null} if the token is invalid,
     *         expired, or was already used
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Rotation rotate(String rawToken) {
        RefreshToken token = findByRaw(rawToken);
        if (token == null) {
            return null;
        }
        User user = token.getUser();

        if (token.isRevoked()) {
            log.warn("Refresh token reuse detected for user {} - revoking all sessions", user.getUsername());
            refreshTokenRepository.revokeAllByUser(user);
            return null;
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            return null;
        }
        // Only one concurrent caller can flip revoked false -> true; the loser is treated as reuse.
        if (refreshTokenRepository.revokeIfActive(token.getId()) == 0) {
            log.warn("Concurrent use of one refresh token for user {} - revoking all sessions", user.getUsername());
            refreshTokenRepository.revokeAllByUser(user);
            return null;
        }

        Owner owner = new Owner(user.getId(), user.getUsername(), user.getRole().name());
        return new Rotation(owner, createRefreshToken(user));
    }

    // ── Logout ──────────────────────────────────────────────────────────────

    /** Revokes every session of the token's owner. Returns the owner, or {@code null} if unknown. */
    @Transactional
    public Owner revokeAllForToken(String rawToken) {
        RefreshToken token = findByRaw(rawToken);
        if (token == null) {
            return null;
        }
        User user = token.getUser();
        refreshTokenRepository.revokeAllByUser(user);
        return new Owner(user.getId(), user.getUsername(), user.getRole().name());
    }

    @Transactional
    public void revokeAllForUser(User user) {
        refreshTokenRepository.revokeAllByUser(user);
    }

    // ── Housekeeping ────────────────────────────────────────────────────────

    /** Daily cleanup of expired token rows. */
    @Scheduled(cron = "0 0 3 * * *")   // 03:00 every night
    @Transactional
    public void purgeExpiredTokens() {
        refreshTokenRepository.deleteAllExpiredBefore(Instant.now());
        log.info("Purged expired refresh tokens");
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    /** Loads the row for "<id>.<secret>" and checks the secret; returns null on any mismatch. */
    private RefreshToken findByRaw(String rawToken) {
        if (rawToken == null) {
            return null;
        }
        int dot = rawToken.indexOf('.');
        if (dot <= 0 || dot == rawToken.length() - 1) {
            return null;
        }
        long id;
        try {
            id = Long.parseLong(rawToken.substring(0, dot));
        } catch (NumberFormatException e) {
            return null;
        }
        String secret = rawToken.substring(dot + 1);

        RefreshToken token = refreshTokenRepository.findById(id).orElse(null);
        if (token == null) {
            return null;
        }
        byte[] expected = token.getTokenHash().getBytes(StandardCharsets.UTF_8);
        byte[] actual = sha256(secret).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, actual) ? token : null;   // constant-time compare
    }

    private static String newSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by the JVM spec", e);
        }
    }
}
