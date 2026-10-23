package com.enesucar.inventory.service;

import io.jsonwebtoken.Claims;
import jakarta.annotation.PostConstruct;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    // SECURITY: the signing key must never be a compile-time constant in a public repo.
    // Anyone reading the source could forge a valid token for any user.
    // Injected from the JWT_SECRET environment variable; the default exists only so a
    // local dev run works, and is overridden in docker-compose and on Railway.
    @Value("${jwt.secret:}")
    private String secretKey;

    /** Lifetime of the access token. Short on purpose: the refresh token (rotated, server-side) keeps an active session alive. */
    @Value("${jwt.access-token.expiry-minutes:15}")
    private long accessTokenMinutes = 15;

    /** Fail fast: a missing or short signing key must stop startup, never silently weaken auth. */
    @PostConstruct
    void validateSecret() {
        if (secretKey == null || secretKey.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "jwt.secret is missing or shorter than 32 bytes. Set the JWT_SECRET environment "
                    + "variable to a long random value (for example: openssl rand -base64 48).");
        }
    }

    /**
     * The token carries the user's database id ({@code uid}) next to the name. A name can be reused after a
     * user is deleted and re-created; the id cannot, so an old token never works for the new account.
     */
    public String generateToken(String username, String role, Long userId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("uid", userId);
        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 1000L * 60 * accessTokenMinutes))
                .signWith(getSignKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /** The database id the token was issued for, or {@code null} for a token without one. */
    public Long extractUserId(String token) {
        Number n = extractClaim(token, claims -> claims.get("uid", Number.class));
        return n == null ? null : n.longValue();
    }

    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    public boolean validateToken(String token, String username) {
        final String tokenUsername = extractUsername(token);
        return tokenUsername.equals(username) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }
}
