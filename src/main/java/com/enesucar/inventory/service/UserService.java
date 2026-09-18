package com.enesucar.inventory.service;

import com.enesucar.inventory.aspect.Auditable;
import com.enesucar.inventory.dto.ChangePasswordRequest;
import com.enesucar.inventory.dto.ChangeRoleRequest;
import com.enesucar.inventory.dto.UserResponse;
import com.enesucar.inventory.entity.AuditAction;
import com.enesucar.inventory.entity.User;
import com.enesucar.inventory.exception.ResourceNotFoundException;
import com.enesucar.inventory.repository.RefreshTokenRepository;
import com.enesucar.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .toList();
    }

    public UserResponse getUserById(Long id) {
        return UserResponse.from(findUser(id));
    }

    @Auditable(action = AuditAction.USER_ROLE_CHANGED, entityType = "User", description = "User role changed by admin")
    @Transactional
    public UserResponse changeRole(Long id, ChangeRoleRequest request) {
        User user = findUser(id);
        user.setRole(request.role());
        return UserResponse.from(userRepository.save(user));
    }

    @Auditable(action = AuditAction.USER_PASSWORD_CHANGED, entityType = "User", description = "Password changed")
    @Transactional
    public void changePassword(Long id, ChangePasswordRequest request) {
        String callerUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByUsername(callerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Caller not found"));
        User target = findUser(id);

        // Only ADMIN or the user themselves may change the password
        boolean isAdmin = caller.getRole() == User.Role.ADMIN;
        boolean isSelf  = caller.getId().equals(target.getId());

        if (!isAdmin && !isSelf) {
            throw new AccessDeniedException("You can only change your own password");
        }

        // When changing own password, verify the current password
        if (isSelf && !passwordEncoder.matches(request.currentPassword(), target.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        target.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(target);
    }

    @Auditable(action = AuditAction.USER_DELETED, entityType = "User", description = "User deleted by admin")
    @Transactional
    public void deleteUser(Long id) {
        User user = findUser(id);

        String callerUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        if (user.getUsername().equals(callerUsername)) {
            throw new IllegalArgumentException("You cannot delete your own account");
        }

        // Revoke all refresh tokens so deleted user is immediately locked out
        refreshTokenRepository.revokeAllByUser(user);
        userRepository.deleteById(id);
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }
}
