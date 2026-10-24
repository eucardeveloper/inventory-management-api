package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.LotConsumptionDto;
import com.enesucar.inventory.dto.StockMovementRequest;
import com.enesucar.inventory.dto.StockMovementResponse;
import com.enesucar.inventory.entity.*;
import com.enesucar.inventory.exception.DuplicateMovementException;
import com.enesucar.inventory.exception.IdempotencyKeyReuseException;
import com.enesucar.inventory.exception.InvalidReversalException;
import com.enesucar.inventory.exception.ResourceNotFoundException;
import com.enesucar.inventory.repository.MovementLotConsumptionRepository;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.repository.StockLotRepository;
import com.enesucar.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.enesucar.inventory.aspect.Auditable;
import com.enesucar.inventory.event.LowStockDetectedEvent;
import com.enesucar.inventory.event.StockMovementRecordedEvent;
import com.enesucar.inventory.entity.AuditAction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Books stock movements and owns the transaction, the lock and the ledger write.
 *
 * <p>The division of labour is deliberate: {@link FifoInventoryService} knows the FIFO
 * arithmetic and nothing else, while this class knows when to start a transaction, what to lock
 * and what to record. Concurrency correctness therefore lives in one place instead of being
 * spread across the codebase, and the FIFO rules stay testable without a database.
 */
@Service
@RequiredArgsConstructor
public class StockMovementService {

    private final StockMovementRepository movementRepository;
    private final MovementLotConsumptionRepository consumptionRepository;
    private final StockLotRepository stockLotRepository;
    private final ProductRepository productRepository;
    private final FifoInventoryService fifoService;
    private final ApplicationEventPublisher eventPublisher;

    // ---- Reads ------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<StockMovementResponse> getLedger(Long productId, MovementType type,
                                                 Instant from, Instant to,
                                                 Pageable pageable) {
        if (type != null || from != null || to != null) {
            // Optional filters are added as predicates only when present, so no null parameter ever
            // reaches PostgreSQL (the type-inference problem the simple queries below avoid).
            Specification<StockMovement> spec = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                if (productId != null) {
                    predicates.add(cb.equal(root.get("product").get("id"), productId));
                }
                if (type != null) {
                    predicates.add(cb.equal(root.get("movementType"), type));
                }
                if (from != null) {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
                }
                if (to != null) {
                    predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), to));
                }
                return cb.and(predicates.toArray(new Predicate[0]));
            };
            Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                    Sort.by(Sort.Order.desc("occurredAt"), Sort.Order.desc("id")));
            return movementRepository.findAll(spec, sorted).map(this::toResponse);
        }
        // Use simple no-null-param queries to avoid PostgreSQL type-inference failures.
        if (productId != null) {
            return movementRepository.findLedgerByProduct(productId, pageable)
                    .map(this::toResponse);
        }
        return movementRepository.findLedger(pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public StockMovementResponse findMovement(Long id) {
        return toResponse(movementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movement not found: " + id)));
    }

    // ---- Booking ----------------------------------------------------------------------

    /** A retry repeats the same request by the same user; anything else under the same key is a different request. */
    private static boolean sameRequest(StockMovement existing, StockMovementRequest request, String performedBy) {
        boolean sameCost = request.getMovementType() != MovementType.IN
                || (existing.getUnitCost() != null && request.getUnitCost() != null
                    && existing.getUnitCost().compareTo(request.getUnitCost()) == 0);
        return existing.getProduct().getId().equals(request.getProductId())
                && existing.getQuantity().equals(request.getQuantity())
                && existing.getMovementType() == request.getMovementType()
                && java.util.Objects.equals(existing.getPerformedBy(), performedBy)
                && sameCost;
    }

    /**
     * The original answer to a retried request, or empty when the key belongs to a different request.
     *
     * <p>A retry (same key, same product, quantity, type, cost and user) is answered with the movement
     * that was already booked, so a client that timed out sees exactly what a first call would have
     * returned. Nothing is booked and nothing is audited here. A different request under the same key
     * is never answered: another user must not learn about someone else's movement.
     */
    @Transactional(readOnly = true)
    public java.util.Optional<StockMovementResponse> findReplay(StockMovementRequest request, String performedBy) {
        if (request.getIdempotencyKey() == null || request.getIdempotencyKey().isBlank()) {
            return java.util.Optional.empty();
        }
        return movementRepository.findByIdempotencyKey(request.getIdempotencyKey())
                .filter(existing -> sameRequest(existing, request, performedBy))
                .map(this::toResponse);
    }

    /**
     * Books a movement: opens a lot for IN, or consumes lots in FIFO order for OUT.
     *
     * <p><b>Why the whole method is one transaction.</b> A movement touches three tables — lots,
     * the ledger, and the product's cached stock. If the ledger row were written and the lot
     * update then failed, the inventory would have a record of stock leaving that never left.
     * The previous implementation had exactly this defect: it called {@code save()} twice with
     * no {@code @Transactional} at all, so the two writes were separate transactions and a crash
     * between them left the data inconsistent with no way to detect it.
     *
     * <p><b>Ordering.</b> The lock is taken first, before anything is read or written, so a
     * concurrent movement on the same product blocks at the door rather than half way through.
     */
    @Transactional
    @Auditable(action = AuditAction.STOCK_IN, entityType = "StockMovement", description = "Stock movement recorded")
    public StockMovementResponse recordMovement(StockMovementRequest request, String performedBy) {
        Product product = productRepository.findByIdForUpdate(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found: " + request.getProductId()));

        // Checked AFTER the product row is locked: concurrent requests with the same key then queue
        // here one by one, and every one after the first sees the committed original and gets a clean
        // duplicate signal, instead of racing past the check and hitting the unique constraint
        // mid-transaction. The controller turns that signal into the original response (HTTP 200,
        // Idempotent-Replayed: true), see findReplay. A different request under the same key is refused.
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            var existing = movementRepository.findByIdempotencyKey(request.getIdempotencyKey());
            if (existing.isPresent()) {
                if (!sameRequest(existing.get(), request, performedBy)) {
                    throw new IdempotencyKeyReuseException(request.getIdempotencyKey());
                }
                throw new DuplicateMovementException(request.getIdempotencyKey(), existing.get().getId());
            }
        }

        Instant now = Instant.now();
        StockMovement movement;
        List<LotConsumptionDto> consumptions = Collections.emptyList();
        Long createdLotId = null;
        BigDecimal totalCost;

        if (fifoService.isInbound(request.getMovementType())) {
            if (request.getUnitCost() == null) {
                // A receipt without a cost would create a zero-cost FIFO lot and silently understate
                // the stock value, so it is rejected instead of defaulting to 0.
                throw new IllegalArgumentException("unitCost is required for IN movements");
            }
            BigDecimal unitCost = request.getUnitCost();
            StockLot lot = fifoService.receiveStock(product, request.getQuantity(), unitCost, now);
            createdLotId = lot.getId();
            totalCost = unitCost.multiply(BigDecimal.valueOf(request.getQuantity()));
        } else {
            // PESSIMISTIC_WRITE: serialises concurrent OUT movements on this product.
            List<StockLot> openLots = stockLotRepository.findOpenLotsForUpdate(product.getId());
            consumptions = fifoService.consumeStock(product, openLots, request.getQuantity());
            totalCost = fifoService.calculateCogs(consumptions);
        }

        int stockAfter = fifoService.currentStock(product.getId());

        movement = StockMovement.builder()
                .product(product)
                .quantity(request.getQuantity())
                .movementType(request.getMovementType())
                .unitCost(fifoService.isInbound(request.getMovementType()) ? request.getUnitCost() : null)
                .totalCost(totalCost)
                .occurredAt(now)
                .performedBy(performedBy)
                .idempotencyKey(emptyToNull(request.getIdempotencyKey()))
                .stockAfter(stockAfter)
                .build();

        try {
            movement = movementRepository.saveAndFlush(movement);
        } catch (DataIntegrityViolationException e) {
            // Only reachable if the same key raced in through a different product's lock. The
            // session is unusable after a constraint violation, so no further query is attempted
            // here: the unique constraint already decided, and the caller can look the original up.
            if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
                throw new DuplicateMovementException(request.getIdempotencyKey(), null);
            }
            throw e;
        }

        persistConsumptions(movement, consumptions);

        if (createdLotId != null) {
            // Trace the lot back to the receipt that created it; reversing that receipt needs this link.
            final Long lotId = createdLotId;
            final Long movementId = movement.getId();
            stockLotRepository.findById(lotId).ifPresent(l -> {
                l.setSourceMovementId(movementId);
                stockLotRepository.save(l);
            });
        }

        // Product.stock is a denormalised cache of the lot sum, refreshed here so list screens
        // need no aggregate query per row. The lots remain the source of truth.
        product.setStock(stockAfter);
        productRepository.save(product);

        publishMovementEvents(movement, product, stockAfter);

        return toResponse(movement, consumptions, createdLotId);
    }

    /**
     * Corrects a booked movement by appending an opposite entry that points back at it.
     *
     * <p>Nothing is edited and nothing is deleted. Reversing an OUT returns its units to the
     * lots they came from, so the product's FIFO position and valuation are exactly what they
     * were before the mistake — which would not be true if the units were re-received as a new
     * lot at today's cost.
     */
    @Transactional
    @Auditable(action = AuditAction.STOCK_ADJUSTED, entityType = "StockMovement", description = "Stock movement reversed")
    public StockMovementResponse reverseMovement(Long movementId, String reasonCode, String performedBy) {
        // Lock order is the same as in recordMovement: product row first, then its lots. The
        // movement is loaded only AFTER the lock, so two simultaneous reversals of the same
        // movement queue up and the second one sees isReversed() == true.
        Long productId = movementRepository.findProductIdById(movementId)
                .orElseThrow(() -> new ResourceNotFoundException("Movement not found: " + movementId));
        productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));

        StockMovement original = movementRepository.findById(movementId)
                .orElseThrow(() -> new ResourceNotFoundException("Movement not found: " + movementId));

        if (original.isReversed()) {
            throw new InvalidReversalException(
                    "Movement " + movementId + " has already been reversed by movement "
                            + original.getReversedById());
        }
        if (original.isReversal()) {
            throw new InvalidReversalException(
                    "Movement " + movementId + " is itself a reversal and cannot be reversed");
        }

        Product product = original.getProduct();
        Instant now = Instant.now();
        MovementType opposite = original.getMovementType() == MovementType.IN
                ? MovementType.OUT : MovementType.IN;

        List<LotConsumptionDto> consumptions = Collections.emptyList();

        if (original.getMovementType() == MovementType.OUT) {
            // Undo a withdrawal: put the units back into their original lots.
            List<LotConsumptionDto> originalLines = consumptionRepository
                    .findByMovementId(original.getId()).stream()
                    .map(c -> new LotConsumptionDto(c.getLotId(), c.getQuantityTaken(),
                            c.getUnitCost(), c.getLineCost(), now, 0))
                    .toList();
            fifoService.restoreConsumedLots(originalLines);
        } else {
            // Undo a receipt: take the units back out of the lot THAT receipt created, at that lot's
            // own cost. Taking them FIFO from the oldest lot instead would remove the wrong goods and
            // leave the valuation wrong. If part of the lot has already been sold, the receipt can no
            // longer be undone as a whole and the reversal is refused.
            var receivedLot = stockLotRepository.findBySourceMovementIdForUpdate(original.getId());
            List<StockLot> lots = receivedLot.isPresent()
                    ? List.of(receivedLot.get())
                    // Receipts booked before lots were linked to their movement: previous behaviour.
                    : stockLotRepository.findOpenLotsForUpdate(product.getId());
            consumptions = fifoService.consumeStock(product, lots, original.getQuantity());
        }

        int stockAfter = fifoService.currentStock(product.getId());

        StockMovement reversal = movementRepository.saveAndFlush(StockMovement.builder()
                .product(product)
                .quantity(original.getQuantity())
                .movementType(opposite)
                .unitCost(original.getUnitCost())
                .totalCost(consumptions.isEmpty() ? original.getTotalCost() : fifoService.calculateCogs(consumptions))
                .occurredAt(now)
                .performedBy(performedBy)
                .reversalOf(original)
                .reasonCode(reasonCode)
                .stockAfter(stockAfter)
                .build());

        persistConsumptions(reversal, consumptions);

        original.setReversedById(reversal.getId());
        movementRepository.save(original);

        product.setStock(stockAfter);
        productRepository.save(product);

        publishMovementEvents(reversal, product, stockAfter);

        return toResponse(reversal, consumptions, null);
    }

    // ---- Helpers ----------------------------------------------------------------------

    private void persistConsumptions(StockMovement movement, List<LotConsumptionDto> consumptions) {
        if (consumptions.isEmpty()) {
            return;
        }
        consumptionRepository.saveAll(consumptions.stream()
                .map(c -> MovementLotConsumption.builder()
                        .movement(movement)
                        .lotId(c.lotId())
                        .quantityTaken(c.quantityTaken())
                        .unitCost(c.unitCost())
                        .lineCost(c.lineCost())
                        .build())
                .toList());
    }

    private static String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    private StockMovementResponse toResponse(StockMovement m) {
        List<LotConsumptionDto> lines = consumptionRepository.findByMovementId(m.getId()).stream()
                .map(c -> new LotConsumptionDto(c.getLotId(), c.getQuantityTaken(),
                        c.getUnitCost(), c.getLineCost(), m.getOccurredAt(), 0))
                .toList();
        return toResponse(m, lines, null);
    }

    private StockMovementResponse toResponse(StockMovement m, List<LotConsumptionDto> lines,
                                             Long createdLotId) {
        return new StockMovementResponse(
                m.getId(),
                m.getProduct().getId(),
                m.getProduct().getName(),
                m.getProduct().getArticleNumber(),
                m.getMovementType(),
                m.getQuantity(),
                m.getOccurredAt(),
                m.getPerformedBy(),
                m.getTotalCost(),
                lines,
                createdLotId,
                m.getStockAfter(),
                m.getReversalOf() != null ? m.getReversalOf().getId() : null,
                m.getReversedById(),
                m.getReasonCode()
        );
    }

    /**
     * Publishes {@link StockMovementRecordedEvent} and, when applicable,
     * {@link LowStockDetectedEvent} after every successful booking.
     *
     * <p>Both events are published inside the still-open transaction so that
     * {@code @TransactionalEventListener(AFTER_COMMIT)} consumers are guaranteed
     * to see a committed movement — never a phantom for a rolled-back one.
     */
    private void publishMovementEvents(StockMovement movement, Product product, int stockAfter) {
        eventPublisher.publishEvent(new StockMovementRecordedEvent(
                movement.getId(),
                product.getId(),
                product.getName(),
                product.getArticleNumber(),
                movement.getMovementType(),
                movement.getQuantity(),
                stockAfter,
                movement.getTotalCost(),
                movement.getPerformedBy(),
                movement.getOccurredAt()
        ));

        if (product.getReorderLevel() != null && stockAfter <= product.getReorderLevel()) {
            eventPublisher.publishEvent(new LowStockDetectedEvent(
                    product.getId(),
                    product.getName(),
                    product.getArticleNumber(),
                    stockAfter,
                    product.getReorderLevel()
            ));
        }
    }
}
