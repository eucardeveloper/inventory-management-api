package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.LoginRequest;
import com.enesucar.inventory.dto.LoginResponse;
import com.enesucar.inventory.dto.RegisterRequest;
import com.enesucar.inventory.entity.User;
import com.enesucar.inventory.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import com.enesucar.inventory.entity.AuditAction;
import com.enesucar.inventory.service.AuditLogService;

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

    @Value("${jwt.refresh-token.expiry-days:7}")
    private int refreshExpiryDays;

    // ── Register ─────────────────────────────────────────────────────────────

    @Transactional
    public LoginResponse register(RegisterRequest request,
                                  HttpServletResponse response) {
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        userRepository.save(user);
        auditLogService.recordAsync(
            AuditAction.USER_REGISTER, "User", null, null, user.getUsername(),
            "New user registered with role " + user.getRole().name(),
            user.getUsername(), "internal");

        return issueTokensAndCookies(user, response);
    }

    // ── Login ────────────────────────────────────────────────────────────────

    @Transactional
    public LoginResponse login(LoginRequest request,
                               HttpServletResponse response) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(), request.getPassword()));
        } catch (org.springframework.security.core.AuthenticationException e) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid username or password", e);
        }

        User user = userRepository.findByUsername(request.getUsername()).orElseThrow();
        log.info("Login success for user {}", user.getUsername());
        auditLogService.recordAsync(
            AuditAction.USER_LOGIN, "User", String.valueOf(user.getId()),
            null, null, "User logged in",
            user.getUsername(), "internal");
        return issueTokensAndCookies(user, response);
    }

    // ── Refresh ──────────────────────────────────────────────────────────────

    /**
     * Rotates the refresh token and issues a new access token.
     * Returns the username on success so the caller can load user details,
     * or throws if the cookie is missing / the token is invalid.
     */
    @Transactional
    public LoginResponse refresh(HttpServletRequest request,
                                 HttpServletResponse response) {
        String rawRefresh = extractCookieValue(request, REFRESH_COOKIE);
        if (rawRefresh == null) {
            throw new IllegalArgumentException("Missing refresh token cookie");
        }

        // getUserFromRawToken validates + checks expiry without rotating
        User user = refreshTokenService.getUserFromRawToken(rawRefresh);
        if (user == null) {
            clearCookies(response);
            throw new IllegalArgumentException("Invalid or expired refresh token");
        }

        // Rotate: old refresh token is revoked, a fresh one is issued
        String newRawRefresh = refreshTokenService.rotate(rawRefresh);
        if (newRawRefresh == null) {
            clearCookies(response);
            throw new IllegalArgumentException("Refresh token rotation failed");
        }

        // Issue new access JWT
        String accessJwt = jwtService.generateToken(user.getUsername(), user.getRole().name());
        setAccessCookie(response, accessJwt);
        setRefreshCookie(response, newRawRefresh);

        return new LoginResponse(accessJwt, user.getRole().name());
    }

    // ── Logout ───────────────────────────────────────────────────────────────

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String rawRefresh = extractCookieValue(request, REFRESH_COOKIE);
        if (rawRefresh != null) {
            User user = refreshTokenService.getUserFromRawToken(rawRefresh);
            if (user != null) {
                refreshTokenService.revokeAllForUser(user);
                log.info("Logged out user {}", user.getUsername());
                auditLogService.recordAsync(
                    AuditAction.USER_LOGOUT, "User", String.valueOf(user.getId()),
                    null, null, "User logged out",
                    user.getUsername(), "internal");
            }
        }
        clearCookies(response);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private LoginResponse issueTokensAndCookies(User user, HttpServletResponse response) {
        String accessJwt   = jwtService.generateToken(user.getUsername(), user.getRole().name());
        String rawRefresh  = refreshTokenService.createRefreshToken(user);

        setAccessCookie(response, accessJwt);
        setRefreshCookie(response, rawRefresh);

        return new LoginResponse(accessJwt, user.getRole().name());
    }

    private void setAccessCookie(HttpServletResponse response, String jwt) {
        Cookie cookie = new Cookie(ACCESS_COOKIE, jwt);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);          // set true behind HTTPS in production
        cookie.setPath("/");
        cookie.setMaxAge(60 * 60 * 24);  // 24 h — matches JWT expiry
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }

    private void setRefreshCookie(HttpServletResponse response, String rawToken) {
        Cookie cookie = new Cookie(REFRESH_COOKIE, rawToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);          // set true behind HTTPS in production
        cookie.setPath("/api/auth");      // only sent to the auth endpoints
        cookie.setMaxAge(60 * 60 * 24 * refreshExpiryDays);
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }

    private void clearCookies(HttpServletResponse response) {
        Cookie access = new Cookie(ACCESS_COOKIE, "");
        access.setMaxAge(0);
        access.setPath("/");
        response.addCookie(access);

        Cookie refresh = new Cookie(REFRESH_COOKIE, "");
        refresh.setMaxAge(0);
        refresh.setPath("/api/auth");
        response.addCookie(refresh);
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
