package com.enesucar.inventory.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * The single place where auth cookies are built, so HttpOnly / Secure / SameSite can never
 * drift apart between the access cookie, the refresh cookie and the cookie that clears them.
 *
 * <p>{@code app.cookie.secure} defaults to true. Only the {@code local} profile (plain-HTTP
 * development on localhost) switches it off, see application-local.properties.
 */
@Component
public class CookieFactory {

    private final boolean secure;
    private final String sameSite;

    public CookieFactory(@Value("${app.cookie.secure:true}") boolean secure,
                         @Value("${app.cookie.same-site:Strict}") String sameSite) {
        this.secure = secure;
        this.sameSite = sameSite;
    }

    /** Value of a {@code Set-Cookie} header: HttpOnly + configured Secure/SameSite. */
    public String build(String name, String value, String path, long maxAgeSeconds) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(path)
                .maxAge(maxAgeSeconds)
                .build()
                .toString();
    }

    /** A cookie that instructs the browser to delete {@code name} (Max-Age=0). */
    public String clear(String name, String path) {
        return build(name, "", path, 0);
    }
}
