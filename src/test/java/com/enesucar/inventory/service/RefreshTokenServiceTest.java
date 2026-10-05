package com.enesucar.inventory.service;

import com.enesucar.inventory.entity.RefreshToken;
import com.enesucar.inventory.entity.User;
import com.enesucar.inventory.repository.RefreshTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RefreshTokenServiceTest {

    @Test
    void revokedTokenReuseRevokesEveryTokenForUser() {
        RefreshTokenRepository repository = mock(RefreshTokenRepository.class);
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        RefreshTokenService service = new RefreshTokenService(repository, encoder);
        User user = new User();
        user.setUsername("alice");

        RefreshToken revoked = new RefreshToken();
        revoked.setId(7L);
        revoked.setUser(user);
        revoked.setTokenHash(encoder.encode("stolen-token"));
        revoked.setExpiresAt(Instant.now().plusSeconds(3600));
        revoked.setRevoked(true);

        when(repository.findAll()).thenReturn(List.of(revoked));
        when(repository.findByIdForUpdate(7L)).thenReturn(Optional.of(revoked));

        assertThat(service.rotate("stolen-token")).isNull();
        verify(repository).revokeAllByUser(user);
        verify(repository, never()).save(any(RefreshToken.class));
    }
}
