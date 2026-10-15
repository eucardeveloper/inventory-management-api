package com.enesucar.inventory.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Single place that decides which address counts as "the client".
 *
 * <p>The default is the TCP peer ({@code getRemoteAddr()}), which a caller cannot forge. The
 * {@code X-Forwarded-For} header is a plain request header: anything the client sends is passed on,
 * so reading its first value lets any caller write an arbitrary address into the audit log and
 * dodge the per-address login limit. It is therefore read only when
 * {@code app.trust-forwarded-for=true}, i.e. when the API runs behind exactly one reverse proxy
 * that appends the address it saw. In that case the <b>last</b> entry (the one the trusted proxy
 * added) is used, never the first.
 */
@Component
public class ClientIpResolver {

    private final boolean trustForwardedFor;

    public ClientIpResolver(@Value("${app.trust-forwarded-for:false}") boolean trustForwardedFor) {
        this.trustForwardedFor = trustForwardedFor;
    }

    public String resolve(HttpServletRequest request) {
        if (trustForwardedFor) {
            String header = request.getHeader("X-Forwarded-For");
            if (header != null && !header.isBlank()) {
                String[] parts = header.split(",");
                for (int i = parts.length - 1; i >= 0; i--) {
                    String candidate = parts[i].trim();
                    if (!candidate.isEmpty()) {
                        return candidate;
                    }
                }
            }
        }
        return request.getRemoteAddr();
    }
}
