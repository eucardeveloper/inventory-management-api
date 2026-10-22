package com.enesucar.inventory.aspect;

import com.enesucar.inventory.dto.StockMovementResponse;
import com.enesucar.inventory.entity.AuditAction;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.security.ClientIpResolver;
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
    private final ClientIpResolver clientIps;

    /**
     * Fires after any {@code @Auditable} method returns normally, void methods included (the result
     * is then null). A single advice is deliberate: a second advice for void methods made both fire
     * for them and wrote every audit row twice. When there is no result, the entity id is taken from
     * the first numeric argument, which for deactivate/delete/role-change calls is the target id.
     */
    @AfterReturning(
        pointcut = "@annotation(auditable)",
        returning = "result"
    )
    public void afterAuditableReturning(JoinPoint joinPoint, Auditable auditable, Object result) {
        submitAudit(joinPoint, auditable, result);
    }

    private void submitAudit(JoinPoint joinPoint, Auditable auditable, Object result) {
        try {
            String entityId = result != null ? resolveEntityId(result) : resolveEntityIdFromArgs(joinPoint);
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
                resolveAction(auditable, result),
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

    /**
     * recordMovement handles both directions under one annotation (STOCK_IN). The direction is only
     * known from the result, so an outbound movement is logged as STOCK_OUT instead of a goods receipt.
     */
    private static AuditAction resolveAction(Auditable auditable, Object result) {
        if (auditable.action() == AuditAction.STOCK_IN
                && result instanceof StockMovementResponse movement
                && movement.movementType() == MovementType.OUT) {
            return AuditAction.STOCK_OUT;
        }
        return auditable.action();
    }

    private String resolveClientIp() {
        try {
            ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return "internal";
            return clientIps.resolve(attrs.getRequest());
        } catch (Exception e) {
            return "unknown";
        }
    }

    private static String resolveEntityIdFromArgs(JoinPoint joinPoint) {
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof Long || arg instanceof Integer) {
                return arg.toString();
            }
        }
        return null;
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
