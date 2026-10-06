package com.enesucar.inventory.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of {@code POST /api/suppliers} and {@code PUT /api/suppliers/{id}}. */
public record SupplierRequest(
        @NotBlank @Size(max = 255) String companyName,
        @Size(max = 255) String contactPerson,
        @NotBlank @Email @Size(max = 255) String email,
        @Size(max = 50) String phone
) {}
