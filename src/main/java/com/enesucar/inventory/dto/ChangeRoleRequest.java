package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.User;
import jakarta.validation.constraints.NotNull;

public record ChangeRoleRequest(@NotNull User.Role role) {}
