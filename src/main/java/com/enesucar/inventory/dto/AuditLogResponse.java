package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.AuditLog;

import java.time.Instant;

public record AuditLogResponse(
    Long id,
    Long userId,
    String username,
    String action,
    String entityType,
    String entityId,
    String oldValue,
    String newValue,
    String ipAddress,
    String description,
    Instant occurredAt
) {
    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(
            log.getId(),
            log.getUserId(),
            log.getUsername(),
            log.getAction(),
            log.getEntityType(),
            log.getEntityId(),
            log.getOldValue(),
            log.getNewValue(),
            log.getIpAddress(),
            log.getDescription(),
            log.getOccurredAt()
        );
    }
}
