package com.enesucar.inventory.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CookieFactory")
class CookieFactoryTest {

    @Test
    @DisplayName("default configuration: HttpOnly, Secure, SameSite=Strict")
    void secureByDefault() {
        String cookie = new CookieFactory(true, "Strict").build("access_token", "abc", "/", 3600);

        assertThat(cookie)
                .contains("access_token=abc")
                .contains("HttpOnly")
                .contains("Secure")
                .contains("SameSite=Strict")
                .contains("Path=/")
                .contains("Max-Age=3600");
    }

    @Test
    @DisplayName("the local profile can turn Secure off, HttpOnly and SameSite stay")
    void localProfileOptOut() {
        String cookie = new CookieFactory(false, "Strict").build("access_token", "abc", "/", 3600);

        assertThat(cookie).doesNotContain("Secure").contains("HttpOnly").contains("SameSite=Strict");
    }

    @Test
    @DisplayName("the clearing cookie keeps the same attributes and expires immediately")
    void clearCookie() {
        String cookie = new CookieFactory(true, "Strict").clear("refresh_token", "/api/auth");

        assertThat(cookie)
                .contains("refresh_token=")
                .contains("Path=/api/auth")
                .contains("Max-Age=0")
                .contains("HttpOnly")
                .contains("Secure")
                .contains("SameSite=Strict");
    }
}
