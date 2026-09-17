package com.enesucar.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Persisted refresh token record.
 *
 * Refresh tokens are opaque random strings stored server-side so they can be
 * revoked without waiting for expiry. Each login creates one record; each
 * /auth/refresh rotates it (old token deleted, new one inserted — refresh token
 * rotation). Logout deletes the record immediately.
 *
 * The token value itself is hashed with BCrypt before storage so a DB dump
 * cannot be used to forge sessions.
 */
@Entity
@Table(name = "refresh_token",
       indexes = @Index(name = "idx_refresh_token_user", columnList = "user_id"))
@Getter @Setter @NoArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * BCrypt hash of the raw random token sent to the browser.
     * Never store the raw value.
     */
    @Column(nullable = false, unique = true, length = 100)
    private String tokenHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Instant expiresAt;

    /** Set when the token has been superseded by rotation or an explicit logout. */
    @Column(nullable = false)
    private boolean revoked = false;
}
