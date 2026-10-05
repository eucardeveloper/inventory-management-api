package com.enesucar.inventory.aspect;

import com.enesucar.inventory.entity.AuditAction;
import com.enesucar.inventory.service.AuditLogService;
import org.aspectj.lang.JoinPoint;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuditAspectTest {

    @Test
    void recordsAuditSynchronouslySoFailureIsVisibleToTheTransaction() {
        AuditLogService auditLogService = mock(AuditLogService.class);
        AuditAspect aspect = new AuditAspect(auditLogService);
        JoinPoint joinPoint = mock(JoinPoint.class);
        Auditable auditable = mock(Auditable.class);
        when(auditable.action()).thenReturn(AuditAction.PRODUCT_CREATED);
        when(auditable.entityType()).thenReturn("Product");
        when(auditable.description()).thenReturn("created");

        aspect.afterAuditableReturning(joinPoint, auditable, new EntityWithId(42L));

        verify(auditLogService).record(
                AuditAction.PRODUCT_CREATED,
                "Product",
                "42",
                null,
                null,
                "created");
    }

    private record EntityWithId(Long id) {
    }
}
