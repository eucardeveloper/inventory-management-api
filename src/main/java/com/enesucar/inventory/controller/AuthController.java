package com.enesucar.inventory.controller;

import com.enesucar.inventory.dto.LoginRequest;
import com.enesucar.inventory.dto.LoginResponse;
import com.enesucar.inventory.dto.RegisterRequest;
import com.enesucar.inventory.security.ClientIpResolver;
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
    private final ClientIpResolver clientIps;

    /**
     * POST /api/auth/register
     * Creates a user account. ADMIN only (enforced in SecurityConfig). Does NOT sign the new user
     * in: issuing cookies here would replace the calling admin's own session.
     */
    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(
            @jakarta.validation.Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        return ResponseEntity.ok(authService.register(request, response, clientIps.resolve(httpRequest)));
    }

    /**
     * POST /api/auth/login
     * Authenticates credentials; sets HttpOnly access_token + refresh_token cookies.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        return ResponseEntity.ok(authService.login(request, response, clientIps.resolve(httpRequest)));
    }

    /**
     * POST /api/auth/refresh
     * Validates the refresh_token cookie, rotates it, and issues a new access_token
     * cookie. No request body needed.
     * <p>Responses: 200 with the session owner; 204 when there is no refresh cookie (nobody is
     * signed in, which is not an error and keeps the browser console clean on the login page);
     * 401 when the cookie is invalid, expired or already used.
     */
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {
        LoginResponse session = authService.refresh(request, response);
        return session == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(session);
    }

    /**
     * POST /api/auth/logout
     * Revokes all refresh tokens for the user and clears both cookies.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response) {
        authService.logout(request, response, clientIps.resolve(request));
        return ResponseEntity.noContent().build();
    }
}
