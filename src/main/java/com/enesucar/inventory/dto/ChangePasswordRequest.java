package com.enesucar.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
    String currentPassword,
    @NotBlank @Size(min = 8) String newPassword
) {}
