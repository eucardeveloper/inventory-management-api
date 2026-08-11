package com.enesucar.lagerverwaltung.service;

import com.enesucar.lagerverwaltung.dto.LoginRequest;
import com.enesucar.lagerverwaltung.dto.LoginResponse;
import com.enesucar.lagerverwaltung.dto.RegisterRequest;
import com.enesucar.lagerverwaltung.entity.Benutzer;
import com.enesucar.lagerverwaltung.repository.BenutzerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final BenutzerRepository benutzerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public LoginResponse registrieren(RegisterRequest request) {
        Benutzer benutzer = new Benutzer();
        benutzer.setBenutzername(request.getBenutzername());
        benutzer.setPasswort(passwordEncoder.encode(request.getPasswort()));
        benutzer.setRolle(request.getRolle());
        benutzerRepository.save(benutzer);
        String token = jwtService.tokenErstellen(benutzer.getBenutzername());
        return new LoginResponse(token);
    }

    public LoginResponse anmelden(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getBenutzername(),
                        request.getPasswort()
                )
        );
        Benutzer benutzer = benutzerRepository
                .findByBenutzername(request.getBenutzername())
                .orElseThrow();
        String token = jwtService.tokenErstellen(benutzer.getBenutzername());
        return new LoginResponse(token);
    }
}