package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.LoginRequest;
import com.enesucar.inventory.dto.LoginResponse;
import com.enesucar.inventory.dto.RegisterRequest;
import com.enesucar.inventory.entity.User;
import com.enesucar.inventory.repository.UserRepository;
import com.enesucar.inventory.security.AccountLoginThrottle;
import com.enesucar.inventory.security.CookieFactory;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import com.enesucar.inventory.entity.AuditAction;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    // Cookie names — keep in sync with JwtFilter and the frontend
    public static final String ACCESS_COOKIE  = "access_token";
    public static final String REFRESH_COOKIE = "refresh_token";

    private final UserRepository       userRepository;
    private final PasswordEncoder      passwordEncoder;
    private final JwtService           jwtService;
    private final RefreshTokenService  refreshTokenService;
    private final AuthenticationManager authenticationManager;
    private final AuditLogService      auditLogService;
    private final CookieFactory        cookieFactory;
    private final AccountLoginThrottle accountLoginThrottle;

    // ── Register ─────────────────────────────────────────────────────────────

    @Transactional
    public LoginResponse register(RegisterRequest request,
                                  HttpServletResponse response,
                                  String clientIp) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Username already exists");
        }
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        userRepository.save(user);
        auditLogService.recordAsync(
            AuditAction.USER_REGISTER, "User", null, null, user.getUsername(),
            "New user registered with role " + user.getRole().name(),
            user.getUsername(), clientIp);

        // No tokens: the caller is an admin creating an account, not the new user logging in.
        return new LoginResponse(null, user.getRole().name(), user.getUsername());
    }

    // ── Login ────────────────────────────────────────────────────────────────

    @Transactional
    public LoginResponse login(LoginRequest request,
                               HttpServletResponse response,
                               String clientIp) {
        // Counted before the password is checked (parallel guesses cannot slip past); cleared on success below.
        accountLoginThrottle.reserve(request.getUsername());
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(), request.getPassword()));
        } catch (AuthenticationException e) {
            throw new BadCredentialsException("Invalid username or password", e);
        }

        accountLoginThrottle.reset(request.getUsername());
        User user = userRepository.findByUsername(request.getUsername()).orElseThrow();
        log.info("Login success for user {}", user.getUsername());
        auditLogService.recordAsync(
            AuditAction.USER_LOGIN, "User", String.valueOf(user.getId()),
            null, null, "User logged in",
            user.getUsername(), clientIp);
        return issueTokensAndCookies(user, response);
    }

    // ── Refresh ──────────────────────────────────────────────────────────────

    /**
     * Rotates the refresh token and issues a new access token.
     * Returns the username on success so the caller can load user details.
     * Returns {@code null} when the request carries no refresh cookie at all (a visitor who is not
     * signed in; the web app asks this on every page load), and throws an authentication failure
     * (401) when a cookie is present but invalid, expired or already used.
     */
    @Transactional
    public LoginResponse refresh(HttpServletRequest request,
                                 HttpServletResponse response) {
        String rawRefresh = extractCookieValue(request, REFRESH_COOKIE);
        if (rawRefresh == null) {
            return null;
        }

        // Validates the token, revokes it and issues a replacement in one step.
        RefreshTokenService.Rotation rotation = refreshTokenService.rotate(rawRefresh);
        if (rotation == null) {
            clearCookies(response);
            throw new InsufficientAuthenticationException("Invalid, expired or already used refresh token");
        }
        RefreshTokenService.Owner owner = rotation.owner();

        // Issue new access JWT
        String accessJwt = jwtService.generateToken(owner.username(), owner.role(), owner.userId());
        setAccessCookie(response, accessJwt);
        setRefreshCookie(response, rotation.newRawToken());

        return new LoginResponse(accessJwt, owner.role(), owner.username());
    }

    // ── Logout ───────────────────────────────────────────────────────────────

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response, String clientIp) {
        String rawRefresh = extractCookieValue(request, REFRESH_COOKIE);
        if (rawRefresh != null) {
            RefreshTokenService.Owner owner = refreshTokenService.revokeAllForToken(rawRefresh);
            if (owner != null) {
                log.info("Logged out user {}", owner.username());
                auditLogService.recordAsync(
                    AuditAction.USER_LOGOUT, "User", String.valueOf(owner.userId()),
                    null, null, "User logged out",
                    owner.username(), clientIp);
            }
        }
        clearCookies(response);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private LoginResponse issueTokensAndCookies(User user, HttpServletResponse response) {
        String accessJwt   = jwtService.generateToken(user.getUsername(), user.getRole().name(), user.getId());
        String rawRefresh  = refreshTokenService.createRefreshToken(user);

        setAccessCookie(response, accessJwt);
        setRefreshCookie(response, rawRefresh);

        return new LoginResponse(accessJwt, user.getRole().name(), user.getUsername());
    }

    private void setAccessCookie(HttpServletResponse response, String jwt) {
        // session cookie: gone when the browser closes; the JWT itself expires after jwt.access-token.expiry-minutes
        response.addHeader(HttpHeaders.SET_COOKIE,
                cookieFactory.buildSession(ACCESS_COOKIE, jwt, "/"));
    }

    private void setRefreshCookie(HttpServletResponse response, String rawToken) {
        // path /api/auth: only sent to the auth endpoints. Session cookie; the server also expires the token
        // after jwt.refresh-token.expiry-hours without use (every refresh issues a new token and restarts that clock).
        response.addHeader(HttpHeaders.SET_COOKIE,
                cookieFactory.buildSession(REFRESH_COOKIE, rawToken, "/api/auth"));
    }

    private void clearCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookieFactory.clear(ACCESS_COOKIE, "/"));
        response.addHeader(HttpHeaders.SET_COOKIE, cookieFactory.clear(REFRESH_COOKIE, "/api/auth"));
    }

    private String extractCookieValue(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
