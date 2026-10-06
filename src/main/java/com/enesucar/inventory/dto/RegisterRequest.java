package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank @Size(min = 3, max = 50)
    private String username;

    @NotBlank @Size(min = 8, max = 100)
    private String password;

    @NotNull
    private User.Role role;
}
