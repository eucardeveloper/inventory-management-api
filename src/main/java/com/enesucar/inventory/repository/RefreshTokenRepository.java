package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.RefreshToken;
import com.enesucar.inventory.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /** Revoke every active token for a user (used on logout / password change). */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.user = :user AND rt.revoked = false")
    void revokeAllByUser(User user);

    /**
     * Atomically revokes one token. Returns 1 only for the single caller that flips it from
     * active to revoked, so two simultaneous refreshes with the same token cannot both succeed.
     */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.id = :id AND rt.revoked = false")
    int revokeIfActive(@Param("id") Long id);

    /** Housekeeping: delete tokens that have passed their expiry. */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :now")
    void deleteAllExpiredBefore(Instant now);
}
