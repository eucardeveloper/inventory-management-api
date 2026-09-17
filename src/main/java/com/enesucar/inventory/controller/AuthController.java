package com.enesucar.inventory.controller;

import com.enesucar.inventory.dto.LoginRequest;
import com.enesucar.inventory.dto.LoginResponse;
import com.enesucar.inventory.dto.RegisterRequest;
import com.enesucar.inventory.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/register
     * Creates a new user account and immediately issues access + refresh cookies.
     */
    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(
            @RequestBody RegisterRequest request,
            HttpServletResponse response) {
        return ResponseEntity.ok(authService.register(request, response));
    }

    /**
     * POST /api/auth/login
     * Authenticates credentials; sets HttpOnly access_token + refresh_token cookies.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @RequestBody LoginRequest request,
            HttpServletResponse response) {
        return ResponseEntity.ok(authService.login(request, response));
    }

    /**
     * POST /api/auth/refresh
     * Validates the refresh_token cookie, rotates it, and issues a new access_token
     * cookie. No request body needed.
     */
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {
        return ResponseEntity.ok(authService.refresh(request, response));
    }

    /**
     * POST /api/auth/logout
     * Revokes all refresh tokens for the user and clears both cookies.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response) {
        authService.logout(request, response);
        return ResponseEntity.noContent().build();
    }
}
