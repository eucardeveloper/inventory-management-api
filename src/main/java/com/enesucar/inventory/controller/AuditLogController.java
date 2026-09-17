package com.enesucar.inventory.controller;

import com.enesucar.inventory.dto.AuditLogResponse;
import com.enesucar.inventory.entity.AuditAction;
import com.enesucar.inventory.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

/**
 * Read-only audit trail endpoint.
 *
 * <p>Access is restricted to ADMIN and WAREHOUSE_MANAGER roles — operators should
 * be able to see what changed in their warehouse, but not every employee needs it.
 */
@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@Tag(name = "Audit Log", description = "Immutable audit trail — who did what and when")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
    @Operation(
        summary = "Search audit log",
        description = "Returns a paginated, filtered view of the audit trail. " +
                      "All parameters are optional; omitting them returns the full log newest-first."
    )
    public ResponseEntity<Page<AuditLogResponse>> search(
            @Parameter(description = "Filter by user id")
            @RequestParam(required = false) Long userId,

            @Parameter(description = "Filter by entity type, e.g. Product, Supplier")
            @RequestParam(required = false) String entityType,

            @Parameter(description = "Filter by audit action enum value")
            @RequestParam(required = false) AuditAction action,

            @Parameter(description = "Include events at or after this instant (ISO-8601)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,

            @Parameter(description = "Include events at or before this instant (ISO-8601)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,

            @ParameterObject
            @PageableDefault(size = 25, sort = "occurredAt", direction = Sort.Direction.DESC)
            Pageable pageable) {

        Page<AuditLogResponse> page = auditLogService
            .search(userId, entityType, action, from, to, pageable)
            .map(AuditLogResponse::from);

        return ResponseEntity.ok(page);
    }
}
