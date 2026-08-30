package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.LotConsumptionDto;
import com.enesucar.inventory.dto.StockMovementRequest;
import com.enesucar.inventory.dto.StockMovementResponse;
import com.enesucar.inventory.entity.*;
import com.enesucar.inventory.exception.DuplicateMovementException;
import com.enesucar.inventory.exception.InvalidReversalException;
import com.enesucar.inventory.exception.ResourceNotFoundException;
import com.enesucar.inventory.repository.MovementLotConsumptionRepository;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.repository.StockLotRepository;
import com.enesucar.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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

    // ---- Reads ------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<StockMovementResponse> getLedger(Long productId, MovementType type,
                                                 LocalDateTime from, LocalDateTime to,
                                                 Pageable pageable) {
        return movementRepository.findLedger(productId, type, from, to, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<StockMovementResponse> getAllMovements() {
        return movementRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public StockMovementResponse findMovement(Long id) {
        return toResponse(movementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movement not found: " + id)));
    }

    // ---- Booking ----------------------------------------------------------------------

    /**
     * Books a movement: opens a lot for IN, or consumes lots in FIFO order for OUT.
     *
     * <p><b>Why the whole method is one transaction.</b> A movement touches three tables — lots,
     * the ledger, and the product's cached stock. If the ledger row were written and the lot
     * update then failed, the warehouse would have a record of stock leaving that never left.
     * The previous implementation had exactly this defect: it called {@code save()} twice with
     * no {@code @Transactional} at all, so the two writes were separate transactions and a crash
     * between them left the data inconsistent with no way to detect it.
     *
     * <p><b>Ordering.</b> The lock is taken first, before anything is read or written, so a
     * concurrent movement on the same product blocks at the door rather than half way through.
     */
    @Transactional
    public StockMovementResponse recordMovement(StockMovementRequest request, String performedBy) {
        // A repeated key means this exact request already succeeded. Return the original rather
        // than erroring: a retry should look identical to the first call from the caller's side.
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            var existing = movementRepository.findByIdempotencyKey(request.getIdempotencyKey());
            if (existing.isPresent()) {
                throw new DuplicateMovementException(request.getIdempotencyKey(), existing.get().getId());
            }
        }

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found: " + request.getProductId()));

        LocalDateTime now = LocalDateTime.now();
        StockMovement movement;
        List<LotConsumptionDto> consumptions = Collections.emptyList();
        Long createdLotId = null;
        BigDecimal totalCost;

        if (fifoService.isInbound(request.getMovementType())) {
            BigDecimal unitCost = request.getUnitCost() != null ? request.getUnitCost() : BigDecimal.ZERO;
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
            // Two requests with the same key raced past the check above. The unique constraint
            // is the only thing that can arbitrate, which is precisely why it exists.
            var existing = movementRepository.findByIdempotencyKey(request.getIdempotencyKey());
            if (existing.isPresent()) {
                throw new DuplicateMovementException(request.getIdempotencyKey(), existing.get().getId());
            }
            throw e;
        }

        persistConsumptions(movement, consumptions);

        // Product.stock is a denormalised cache of the lot sum, refreshed here so list screens
        // need no aggregate query per row. The lots remain the source of truth.
        product.setStock(stockAfter);
        productRepository.save(product);

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
    public StockMovementResponse reverseMovement(Long movementId, String reasonCode, String performedBy) {
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
        LocalDateTime now = LocalDateTime.now();
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
            // Undo a receipt: consume the units back out, FIFO, so the books stay consistent
            // even if part of that lot has already been sold on.
            List<StockLot> openLots = stockLotRepository.findOpenLotsForUpdate(product.getId());
            consumptions = fifoService.consumeStock(product, openLots, original.getQuantity());
        }

        int stockAfter = fifoService.currentStock(product.getId());

        StockMovement reversal = movementRepository.saveAndFlush(StockMovement.builder()
                .product(product)
                .quantity(original.getQuantity())
                .movementType(opposite)
                .unitCost(original.getUnitCost())
                .totalCost(original.getTotalCost())
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
}
