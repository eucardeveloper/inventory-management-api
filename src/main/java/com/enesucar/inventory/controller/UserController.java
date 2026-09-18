package com.enesucar.inventory.controller;

import com.enesucar.inventory.dto.ChangePasswordRequest;
import com.enesucar.inventory.dto.ChangeRoleRequest;
import com.enesucar.inventory.dto.UserResponse;
import com.enesucar.inventory.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "Admin-only user management endpoints")
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all users", description = "Returns all registered users. ADMIN only.")
    public List<UserResponse> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get user by ID")
    public UserResponse getUser(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Change user role",
        description = "Assigns a new role (ADMIN, WAREHOUSE_MANAGER, STAFF) to the specified user. ADMIN only."
    )
    public UserResponse changeRole(@PathVariable Long id,
                                   @Valid @RequestBody ChangeRoleRequest request) {
        return userService.changeRole(id, request);
    }

    @PatchMapping("/{id}/password")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'STAFF')")
    @Operation(
        summary = "Change password",
        description = "ADMIN can change any user's password. Other users can only change their own password " +
                      "and must supply the current password for verification."
    )
    public ResponseEntity<Void> changePassword(@PathVariable Long id,
                                                @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Delete user",
        description = "Permanently deletes a user and revokes all their active sessions. " +
                      "ADMIN only. An admin cannot delete their own account."
    )
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
