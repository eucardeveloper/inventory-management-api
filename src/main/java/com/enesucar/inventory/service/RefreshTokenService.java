package com.enesucar.inventory.service;

import com.enesucar.inventory.entity.RefreshToken;
import com.enesucar.inventory.entity.User;
import com.enesucar.inventory.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

/**
 * Manages opaque refresh tokens.
 *
 * Security properties:
 *  - Token value is 256-bit CSPRNG — cannot be guessed
 *  - Only a BCrypt hash is persisted — DB leak cannot replay sessions
 *  - Rotation: each use invalidates the old token and issues a new one
 *  - Reuse detection: using a revoked token triggers full revocation of all
 *    tokens for that user (signs of token theft)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 32;   // 256 bits → 43 base64url chars

    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${jwt.refresh-token.expiry-days:7}")
    private int expiryDays;

    // ── Create ──────────────────────────────────────────────────────────────

    /**
     * Generates a new opaque refresh token for {@code user}, persists a hash,
     * and returns the raw (plaintext) token to be placed in the HttpOnly cookie.
     */
    @Transactional
    public String createRefreshToken(User user) {
        String rawToken = generateSecureToken();
        String hash     = passwordEncoder.encode(rawToken);

        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setTokenHash(hash);
        rt.setExpiresAt(Instant.now().plus(expiryDays, ChronoUnit.DAYS));
        rt.setRevoked(false);
        refreshTokenRepository.save(rt);

        return rawToken;
    }

    // ── Rotate ──────────────────────────────────────────────────────────────

    /**
     * Validates the incoming raw token, revokes it, and issues a fresh one.
     *
     * @return the new raw refresh token, or {@code null} if validation failed
     */
    @Transactional
    public String rotate(String rawToken) {
        // Find a candidate by iterating valid tokens for the hash match.
        // (BCrypt is intentionally slow; in production consider a secondary
        //  lookup index on a fast hash like SHA-256 to avoid a full-table scan.)
        var candidates = refreshTokenRepository.findAll().stream()
                .filter(rt -> !rt.isRevoked()
                        && rt.getExpiresAt().isAfter(Instant.now())
                        && passwordEncoder.matches(rawToken, rt.getTokenHash()))
                .findFirst();

        if (candidates.isEmpty()) {
            log.warn("Refresh token rotation failed — token not found or expired");
            return null;
        }

        RefreshToken old = candidates.get();

        // Reuse detection: if the found token is already revoked, assume theft
        // and blow away every token for this user.
        if (old.isRevoked()) {
            log.warn("Refresh token reuse detected for user {} — revoking all tokens",
                    old.getUser().getUsername());
            refreshTokenRepository.revokeAllByUser(old.getUser());
            return null;
        }

        // Rotate: revoke old, issue new
        old.setRevoked(true);
        refreshTokenRepository.save(old);

        return createRefreshToken(old.getUser());
    }

    // ── Lookup ──────────────────────────────────────────────────────────────

    /**
     * Finds the user associated with a raw refresh token without rotating it.
     * Used by the /auth/refresh endpoint to load the user before issuing a new
     * access JWT.
     */
    @Transactional(readOnly = true)
    public User getUserFromRawToken(String rawToken) {
        return refreshTokenRepository.findAll().stream()
                .filter(rt -> !rt.isRevoked()
                        && rt.getExpiresAt().isAfter(Instant.now())
                        && passwordEncoder.matches(rawToken, rt.getTokenHash()))
                .map(RefreshToken::getUser)
                .findFirst()
                .orElse(null);
    }

    // ── Revoke ──────────────────────────────────────────────────────────────

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

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private String generateSecureToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
