package com.enesucar.inventory.exception;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Writes the API's single error format ({@code application/problem+json}, RFC 7807) for code that
 * runs <em>outside</em> Spring MVC, where {@link GlobalExceptionHandler} cannot help: the security
 * filter chain (401/403) and the rate limiter (429). Everything inside MVC (validation, 404, 409,
 * 500, ...) is rendered by {@link GlobalExceptionHandler} with the same fields, so a client parses
 * one shape: {@code type}, {@code title}, {@code status}, {@code detail}.
 */
public final class ProblemJson {

    /** Base of the {@code type} URI; the slug identifies the problem class. */
    public static final String BASE = "https://api.inventory.local/problems/";

    private ProblemJson() {
    }

    public static void write(HttpServletResponse response, int status, String title, String detail, String slug)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/problem+json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(body(status, title, detail, slug));
    }

    static String body(int status, String title, String detail, String slug) {
        return "{\"type\":\"" + escape(BASE + slug) + "\","
                + "\"title\":\"" + escape(title) + "\","
                + "\"status\":" + status + ","
                + "\"detail\":\"" + escape(detail) + "\"}";
    }

    private static String escape(String value) {
        StringBuilder sb = new StringBuilder(value.length() + 8);
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }
}
