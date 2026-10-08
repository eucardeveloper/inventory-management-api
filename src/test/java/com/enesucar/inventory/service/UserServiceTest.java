package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.ChangePasswordRequest;
import com.enesucar.inventory.dto.ChangeRoleRequest;
import com.enesucar.inventory.entity.User;
import com.enesucar.inventory.exception.LastAdminException;
import com.enesucar.inventory.repository.RefreshTokenRepository;
import com.enesucar.inventory.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService: own password change and last-admin protection")
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private UserService userService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private static User user(long id, String username, User.Role role) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        u.setPassword("hash-of-" + username);
        u.setRole(role);
        return u;
    }

    private void signInAs(User caller) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(caller.getUsername(), null, List.of()));
        when(userRepository.findByUsername(caller.getUsername())).thenReturn(Optional.of(caller));
    }

    // ---- own password change ----------------------------------------------------------

    @Test
    @DisplayName("STAFF changes their own password with the correct current password")
    void staffChangesOwnPassword() {
        User staff = user(3, "staff", User.Role.STAFF);
        signInAs(staff);
        when(passwordEncoder.matches("old-password", "hash-of-staff")).thenReturn(true);
        when(passwordEncoder.encode("new-password-1")).thenReturn("new-hash");

        userService.changeOwnPassword(new ChangePasswordRequest("old-password", "new-password-1"));

        assertThat(staff.getPassword()).isEqualTo("new-hash");
        verify(userRepository).save(staff);
    }

    @Test
    @DisplayName("a wrong current password is rejected and nothing is saved")
    void wrongCurrentPasswordIsRejected() {
        User staff = user(3, "staff", User.Role.STAFF);
        signInAs(staff);
        when(passwordEncoder.matches("guess", "hash-of-staff")).thenReturn(false);

        assertThatThrownBy(() -> userService.changeOwnPassword(new ChangePasswordRequest("guess", "new-password-1")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("incorrect");

        assertThat(staff.getPassword()).isEqualTo("hash-of-staff");
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("changing your own password without the current one is rejected")
    void missingCurrentPasswordIsRejected() {
        User staff = user(3, "staff", User.Role.STAFF);
        signInAs(staff);

        assertThatThrownBy(() -> userService.changeOwnPassword(new ChangePasswordRequest(null, "new-password-1")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("required");
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("STAFF cannot change somebody else's password")
    void staffCannotChangeOthersPassword() {
        User staff = user(3, "staff", User.Role.STAFF);
        User admin = user(1, "admin", User.Role.ADMIN);
        signInAs(staff);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> userService.changePassword(1L, new ChangePasswordRequest("x", "new-password-1")))
                .isInstanceOf(AccessDeniedException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("ADMIN resets another user's password without knowing the current one")
    void adminResetsOthersPassword() {
        User admin = user(1, "admin", User.Role.ADMIN);
        User staff = user(3, "staff", User.Role.STAFF);
        signInAs(admin);
        when(userRepository.findById(3L)).thenReturn(Optional.of(staff));
        when(passwordEncoder.encode("reset-password-1")).thenReturn("reset-hash");

        userService.changePassword(3L, new ChangePasswordRequest(null, "reset-password-1"));

        assertThat(staff.getPassword()).isEqualTo("reset-hash");
        verify(userRepository).save(staff);
    }

    // ---- last admin -------------------------------------------------------------------

    @Test
    @DisplayName("the last ADMIN cannot be demoted")
    void lastAdminCannotBeDemoted() {
        User admin = user(1, "admin", User.Role.ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(userRepository.findAllByRoleForUpdate(User.Role.ADMIN)).thenReturn(List.of(admin));

        assertThatThrownBy(() -> userService.changeRole(1L, new ChangeRoleRequest(User.Role.STAFF)))
                .isInstanceOf(LastAdminException.class);

        assertThat(admin.getRole()).isEqualTo(User.Role.ADMIN);
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("an ADMIN can be demoted while another ADMIN exists")
    void adminCanBeDemotedWhenAnotherExists() {
        User first = user(1, "admin", User.Role.ADMIN);
        User second = user(2, "admin2", User.Role.ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(first));
        when(userRepository.findAllByRoleForUpdate(User.Role.ADMIN)).thenReturn(List.of(first, second));
        when(userRepository.save(first)).thenReturn(first);

        userService.changeRole(1L, new ChangeRoleRequest(User.Role.WAREHOUSE_MANAGER));

        assertThat(first.getRole()).isEqualTo(User.Role.WAREHOUSE_MANAGER);
    }

    @Test
    @DisplayName("promoting a user to ADMIN never needs the guard")
    void promotionSkipsTheGuard() {
        User staff = user(3, "staff", User.Role.STAFF);
        when(userRepository.findById(3L)).thenReturn(Optional.of(staff));
        when(userRepository.save(staff)).thenReturn(staff);

        userService.changeRole(3L, new ChangeRoleRequest(User.Role.ADMIN));

        assertThat(staff.getRole()).isEqualTo(User.Role.ADMIN);
        verify(userRepository, never()).findAllByRoleForUpdate(any());
    }

    @Test
    @DisplayName("the last ADMIN cannot be deleted, even by somebody else")
    void lastAdminCannotBeDeleted() {
        User lastAdmin = user(1, "boss", User.Role.ADMIN);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("someone-else", null, List.of()));
        when(userRepository.findById(1L)).thenReturn(Optional.of(lastAdmin));
        when(userRepository.findAllByRoleForUpdate(User.Role.ADMIN)).thenReturn(List.of(lastAdmin));

        assertThatThrownBy(() -> userService.deleteUser(1L)).isInstanceOf(LastAdminException.class);

        verify(userRepository, never()).deleteById(any());
        verify(refreshTokenRepository, never()).revokeAllByUser(any());
    }

    @Test
    @DisplayName("an admin cannot delete their own account")
    void adminCannotDeleteSelf() {
        User admin = user(1, "admin", User.Role.ADMIN);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", null, List.of()));
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> userService.deleteUser(1L)).isInstanceOf(IllegalArgumentException.class);
        verify(userRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("a non-admin user is deleted and their sessions revoked")
    void staffUserIsDeleted() {
        User staff = user(3, "staff", User.Role.STAFF);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", null, List.of()));
        when(userRepository.findById(3L)).thenReturn(Optional.of(staff));

        userService.deleteUser(3L);

        verify(refreshTokenRepository).revokeAllByUser(staff);
        verify(userRepository).deleteById(3L);
    }
}
