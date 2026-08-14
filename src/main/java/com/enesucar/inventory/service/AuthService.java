package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.LoginRequest;
import com.enesucar.inventory.dto.LoginResponse;
import com.enesucar.inventory.dto.RegisterRequest;
import com.enesucar.inventory.entity.User;
import com.enesucar.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public LoginResponse register(RegisterRequest request) {
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        userRepository.save(user);
        String token = jwtService.tokenErstellen(user.getUsername());
        return new LoginResponse(token, user.getRole().name());
    }

    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );
        User user = userRepository
                .findByUsername(request.getUsername())
                .orElseThrow();
        String token = jwtService.tokenErstellen(user.getUsername());
        return new LoginResponse(token, user.getRole().name());
    }
}
