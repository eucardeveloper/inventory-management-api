package com.enesucar.inventory.event;

import com.enesucar.inventory.entity.MovementType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Published inside the active transaction after a stock movement is successfully persisted.
 *
 * <p><b>Why a domain event instead of a direct service call?</b>
 * StockMovementService must not know about notification systems, low-stock policies,
 * or analytics pipelines. Those are separate business concerns that happen to be
 * triggered by the same fact — a movement occurred. Publishing an event decouples the
 * publisher from its consumers: new reactions can be added without touching the core
 * booking logic, and the service stays unit-testable without mocking every downstream dependency.
 *
 * <p><b>Spring events vs Kafka/RabbitMQ.</b> Spring's in-process event bus is the right
 * starting point: no broker to operate, no serialization format to negotiate, and the
 * {@code @TransactionalEventListener} guarantee means consumers never see an event for a
 * movement that was ultimately rolled back. When the system grows to multiple services,
 * the publisher switches to an outbox table or a broker without touching the consumers.
 */
public record StockMovementRecordedEvent(
        Long movementId,
        Long productId,
        String productName,
        String articleNumber,
        MovementType movementType,
        int quantity,
        int stockAfter,
        BigDecimal totalCost,
        String performedBy,
        LocalDateTime occurredAt
) {}
