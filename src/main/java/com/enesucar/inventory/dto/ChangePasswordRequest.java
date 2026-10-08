package com.enesucar.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param currentPassword required when a user changes their own password; ignored when an admin
 *                        resets someone else's
 * @param newPassword     8 to 100 characters
 */
public record ChangePasswordRequest(
    String currentPassword,
    @NotBlank @Size(min = 8, max = 100) String newPassword
) {}
