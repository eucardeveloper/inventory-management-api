package com.enesucar.inventory.service;

import com.enesucar.inventory.entity.AuditAction;
import com.enesucar.inventory.entity.AuditLog;
import com.enesucar.inventory.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;

/**
 * Central audit-recording service.
 *
 * <p>Two calling modes are supported:
 * <ul>
 *   <li>{@link #record} — synchronous, participates in the caller's transaction (default).</li>
 *   <li>{@link #recordAsync} — fire-and-forget on a virtual-thread executor; the audit row is
 *       written in its own separate transaction so it never rolls back with the business tx.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    // ------------------------------------------------------------------ query

    @Transactional(readOnly = true)
    public Page<AuditLog> search(
            Long userId, String entityType, AuditAction action,
            Instant from, Instant to, Pageable pageable) {
        String actionStr = action == null ? null : action.name();
        String fromStr   = from   == null ? null : from.toString();
        String toStr     = to     == null ? null : to.toString();
        int    size      = pageable.getPageSize();
        long   offset    = pageable.getOffset();

        java.util.List<AuditLog> rows = auditLogRepository.searchPage(
                userId, entityType, actionStr, fromStr, toStr, size, offset);
        long total = auditLogRepository.searchCount(
                userId, entityType, actionStr, fromStr, toStr);

        return new org.springframework.data.domain.PageImpl<>(rows, pageable, total);
    }

    // ------------------------------------------------------------------ write (sync)

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuditAction action, String entityType, String entityId,
                       String oldValue, String newValue, String description) {
        String username = "system";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            username = auth.getName();
        }
        String ip = resolveClientIp();
        AuditLog log = buildLog(action, entityType, entityId, oldValue, newValue, description, username, ip);
        auditLogRepository.save(log);
    }

    // ------------------------------------------------------------------ write (async — fire-and-forget)

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAsync(AuditAction action, String entityType, String entityId,
                            String oldValue, String newValue, String description,
                            String callerUsername, String callerIp) {
        try {
            AuditLog auditLog = buildLog(action, entityType, entityId, oldValue, newValue,
                                         description, callerUsername, callerIp);
            auditLogRepository.save(auditLog);
        } catch (Exception ex) {
            // Audit must never crash the business flow
            log.error("Audit record failed — action={} entity={}/{} : {}",
                      action, entityType, entityId, ex.getMessage(), ex);
        }
    }

    // ------------------------------------------------------------------ helpers

    private AuditLog buildLog(AuditAction action, String entityType, String entityId,
                              String oldValue, String newValue, String description,
                              String username, String ip) {
        Long userId = null;

        return AuditLog.builder()
                .action(action == null ? null : action.name())
                .entityType(entityType)
                .entityId(entityId)
                .oldValue(oldValue)
                .newValue(newValue)
                .description(description)
                .username(username)
                .userId(userId)
                .ipAddress(ip)
                .occurredAt(Instant.now())
                .build();
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
}
