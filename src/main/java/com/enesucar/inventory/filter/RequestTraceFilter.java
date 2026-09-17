package com.enesucar.inventory.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Attaches a per-request trace ID to the SLF4J Mapped Diagnostic Context so
 * every log line emitted during that request carries the same correlation ID.
 *
 * The trace ID is also echoed back in the X-Trace-Id response header so API
 * clients (and the Grafana Loki → trace link) can correlate a failed response
 * to its log entry without grepping by timestamp.
 *
 * MDC keys written:
 *   traceId   – random UUID per request (stable throughout the call chain)
 *   method    – HTTP verb
 *   uri       – request URI (without query string)
 *   userId    – authenticated username, or "anonymous"
 */
@Component
@Order(1)                     // run before JwtFilter so userId is populated by it
public class RequestTraceFilter extends OncePerRequestFilter {

    private static final String TRACE_HEADER = "X-Trace-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String traceId = UUID.randomUUID().toString();

        try {
            MDC.put("traceId", traceId);
            MDC.put("method",  request.getMethod());
            MDC.put("uri",     request.getRequestURI());

            // userId may be null at this point if JwtFilter hasn't run yet;
            // that's fine — we update it after filterChain.doFilter when the
            // security context is populated.
            response.setHeader(TRACE_HEADER, traceId);

            filterChain.doFilter(request, response);

        } finally {
            // Enrich userId retroactively (after the request has been authenticated)
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userId = (auth != null && auth.isAuthenticated())
                    ? auth.getName() : "anonymous";
            MDC.put("userId", userId);

            // Always clear MDC — Tomcat reuses threads (even virtual ones carry
            // thread-locals until they are cleared).
            MDC.clear();
        }
    }
}
