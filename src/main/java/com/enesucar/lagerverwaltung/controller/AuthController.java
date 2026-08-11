package com.enesucar.lagerverwaltung.controller;

import com.enesucar.lagerverwaltung.dto.LoginRequest;
import com.enesucar.lagerverwaltung.dto.LoginResponse;
import com.enesucar.lagerverwaltung.dto.RegisterRequest;
import com.enesucar.lagerverwaltung.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/registrieren")
    public ResponseEntity<LoginResponse> registrieren(
            @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.registrieren(request));
    }

    @PostMapping("/anmelden")
    public ResponseEntity<LoginResponse> anmelden(
            @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.anmelden(request));
    }
}