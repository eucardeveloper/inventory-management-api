package com.enesucar.inventory.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Reacts to stock domain events <em>after</em> the publishing transaction commits.
 *
 * <p><b>Why @TransactionalEventListener instead of @EventListener?</b>
 * A plain {@code @EventListener} fires inline while the transaction is still open.
 * If this handler were to perform a slow operation (send an HTTP alert, write to a
 * second database) the booking transaction would be held open longer, increasing
 * lock contention. Worse, if the listener throws, the business transaction rolls back —
 * so a notification failure could un-book a valid stock movement. Using
 * {@code AFTER_COMMIT} means the movement is durable before any side-effect runs.
 * If the listener then fails, the movement is already committed and nothing is lost;
 * the notification simply didn't go out, which is far preferable to data inconsistency.
 *
 * <p><b>Why @Async?</b>
 * The HTTP response is sent as soon as the transaction commits, before these handlers
 * return. Putting the work on a virtual-thread executor means the caller isn't blocked
 * by alerting logic and the API latency stays predictable regardless of what downstream
 * systems do.
 *
 * <p><b>Why not send emails or call Slack here directly?</b>
 * This listener logs and, in a production system, would publish to an outbox table or
 * a message broker. External HTTP calls from inside a Spring event listener introduce
 * network latency and failure modes that belong in a dedicated integration layer. The
 * current implementation shows the wiring; swapping the log statement for a real
 * notification is a one-line change.
 */
@Slf4j
@Component
public class StockEventListener {

    /**
     * Fires after a stock movement transaction commits successfully.
     * Use this to trigger downstream workflows: inventory reports, audit enrichment,
     * analytics pipelines, or ERP synchronisation.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMovementRecorded(StockMovementRecordedEvent event) {
        log.info("[DOMAIN-EVENT] StockMovementRecorded — id={} product='{}' ({}) type={} qty={} stockAfter={} by={}",
                event.movementId(),
                event.productName(),
                event.articleNumber(),
                event.movementType(),
                event.quantity(),
                event.stockAfter(),
                event.performedBy());

        // Extension points (plug in real integrations here):
        // notificationService.sendMovementConfirmation(event);
        // erpSyncService.pushMovement(event);
        // analyticsService.recordMovement(event);
    }

    /**
     * Fires after a movement drops stock at or below the minimum threshold.
     * In production this is where you send a push notification, create a purchase-order
     * draft, or raise a ticket in the warehouse management system.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLowStockDetected(LowStockDetectedEvent event) {
        log.warn("[DOMAIN-EVENT] LowStockDetected — product='{}' ({}) stock={} threshold={}  *** REORDER NEEDED ***",
                event.productName(),
                event.articleNumber(),
                event.currentStock(),
                event.threshold());

        // Extension points:
        // alertService.sendLowStockAlert(event);
        // purchaseOrderService.createDraftOrder(event.productId(), event.threshold());
    }
}
