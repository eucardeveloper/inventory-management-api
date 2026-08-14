package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.User;
import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String password;
    private User.Role role;
}
