package com.enesucar.inventory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Immutable audit record — once written, never modified.
 * <p>
 * All columns are {@code updatable = false} to enforce the append-only guarantee
 * at the JPA layer, mirroring the same design used in {@link StockMovement}.
 * Even if a bug calls {@code save()} on an already-persisted row the DB row
 * stays unchanged.
 * </p>
 */
@Entity
@Table(
    name = "audit_log",
    indexes = {
        @Index(name = "idx_audit_user_id",     columnList = "user_id"),
        @Index(name = "idx_audit_entity",      columnList = "entity_type, entity_id"),
        @Index(name = "idx_audit_occurred_at", columnList = "occurred_at"),
        @Index(name = "idx_audit_action",      columnList = "action")
    }
)
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(updatable = false)
    private Long id;

    /** Who performed the action. Null for anonymous / system-initiated events. */
    @Column(name = "user_id", updatable = false)
    private Long userId;

    /** Human-readable username snapshot (denormalised for forensic readability). */
    @Column(name = "username", length = 100, updatable = false)
    private String username;

    @Column(nullable = false, length = 40, updatable = false)
    private String action;

    /** Domain entity class simple name, e.g. "Product", "StockMovement". */
    @Column(name = "entity_type", length = 80, updatable = false)
    private String entityType;

    /** PK of the affected entity, stored as String for type flexibility. */
    @Column(name = "entity_id", length = 40, updatable = false)
    private String entityId;

    /** JSON snapshot of the state *before* the mutation; null for CREATE events. */
    @Column(name = "old_value", columnDefinition = "TEXT", updatable = false)
    private String oldValue;

    /** JSON snapshot of the state *after* the mutation; null for DELETE events. */
    @Column(name = "new_value", columnDefinition = "TEXT", updatable = false)
    private String newValue;

    /** Client IP address extracted from the HTTP request. */
    @Column(name = "ip_address", length = 45, updatable = false)
    private String ipAddress;

    /** Additional free-form context (e.g. movement reference, idempotency key). */
    @Column(name = "description", length = 500, updatable = false)
    private String description;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;
}
