package com.enesucar.inventory.aspect;

import com.enesucar.inventory.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * AOP aspect that intercepts all methods annotated with {@link Auditable} and
 * records an audit entry asynchronously so the HTTP response is never delayed.
 *
 * <p>Design notes:
 * <ul>
 *   <li>Uses {@code @AfterReturning} — no audit entry is written for failed operations.</li>
 *   <li>Delegates to {@link AuditLogService#recordAsync} which catches its own exceptions,
 *       guaranteeing this advice never propagates a failure to the caller.</li>
 *   <li>Entity id is resolved from the return value when the returned object has a
 *       {@code getId()} method; otherwise it falls back to "unknown".</li>
 * </ul>
 */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditLogService auditLogService;

    /**
     * Fires after a non-void {@code @Auditable} method returns normally.
     * The return value is used to extract the entity id.
     */
    @AfterReturning(
        pointcut = "@annotation(auditable)",
        returning = "result"
    )
    public void afterAuditableReturning(JoinPoint joinPoint, Auditable auditable, Object result) {
        submitAudit(joinPoint, auditable, result);
    }

    /**
     * Fires after a void {@code @Auditable} method returns normally.
     * Uses a separate pointcut without {@code returning} binding so that Spring AOP
     * does not skip void methods (void is not assignable to Object in returning-binding mode).
     *
     * <p>The two advices target the same annotation; Spring deduplicates correctly because
     * one has a {@code returning} binding and the other does not — they match different
     * method signatures at weave-time.
     */
    @org.aspectj.lang.annotation.AfterReturning(
        pointcut = "@annotation(auditable) && execution(void *(..))"
    )
    public void afterAuditableVoid(JoinPoint joinPoint, Auditable auditable) {
        submitAudit(joinPoint, auditable, null);
    }

    private void submitAudit(JoinPoint joinPoint, Auditable auditable, Object result) {
        try {
            String entityId = resolveEntityId(result);
            String description = auditable.description().isBlank()
                ? joinPoint.getSignature().getName()
                : auditable.description();

            // Resolve caller identity HERE — in the original request thread where
            // SecurityContext and RequestContext are still populated.
            // recordAsync runs on a different thread and cannot see them.
            String username = "system";
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()
                    && !"anonymousUser".equals(auth.getPrincipal())) {
                username = auth.getName();
            }
            String ip = resolveClientIp();

            auditLogService.recordAsync(
                auditable.action(),
                auditable.entityType(),
                entityId,
                null,   // oldValue — populated by explicit calls where needed
                null,   // newValue — populated by explicit calls where needed
                description,
                username,
                ip
            );
        } catch (Exception ex) {
            // Audit aspect must never crash the business flow
            log.warn("AuditAspect failed to submit async audit: {}", ex.getMessage());
        }
    }

    private String resolveClientIp() {
        try {
            ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return "internal";
            var request = attrs.getRequest();
            String xff = request.getHeader("X-Forwarded-For");
            return (xff != null && !xff.isBlank()) ? xff.split(",")[0].trim() : request.getRemoteAddr();
        } catch (Exception e) {
            return "unknown";
        }
    }

    /**
     * Attempts to extract the entity id from the returned object.
     * Tries {@code getId()} first (JPA entities) then {@code id()} (Java records).
     */
    private String resolveEntityId(Object result) {
        if (result == null) return null;
        for (String methodName : new String[]{"getId", "id"}) {
            try {
                var method = result.getClass().getMethod(methodName);
                Object id = method.invoke(result);
                if (id != null) return id.toString();
            } catch (NoSuchMethodException ignored) {
                // try next method name
            } catch (Exception ex) {
                log.debug("Could not resolve entity id via {}: {}", methodName, ex.getMessage());
            }
        }
        return null;
    }
}
