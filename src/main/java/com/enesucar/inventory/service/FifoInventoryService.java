package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.LotConsumptionDto;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.entity.StockLot;
import com.enesucar.inventory.entity.StockMovement;
import com.enesucar.inventory.exception.InsufficientStockException;
import com.enesucar.inventory.repository.StockLotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * The FIFO cost engine: creates lots for inbound stock and consumes them, oldest first, for
 * outbound stock.
 *
 * <p>This class is deliberately small and does exactly one thing. It holds no transaction of
 * its own and takes no lock — {@link StockMovementService} owns the transaction boundary and
 * has already locked the product's lots before calling in here. Keeping the arithmetic
 * separate from the locking and persistence concerns is what makes the FIFO rules directly
 * unit-testable, which matters because they are the part most likely to be wrong in subtle,
 * expensive ways.
 */
@Service
@RequiredArgsConstructor
public class FifoInventoryService {

    private final StockLotRepository stockLotRepository;

    /**
     * Records inbound stock by opening a new lot.
     *
     * <p>Every receipt creates its own lot rather than adding to an existing one, even when the
     * unit cost happens to match. Merging would destroy the arrival ordering FIFO depends on and
     * would make the receipt untraceable back to its delivery.
     */
    public StockLot receiveStock(Product product, int quantity, BigDecimal unitCost,
                                 LocalDateTime receivedAt) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Received quantity must be positive, was: " + quantity);
        }
        if (unitCost == null || unitCost.signum() < 0) {
            throw new IllegalArgumentException("Unit cost must be zero or positive");
        }

        StockLot lot = StockLot.builder()
                .product(product)
                .quantity(quantity)
                .remainingQuantity(quantity)
                .unitCost(unitCost)
                .receivedAt(receivedAt)
                .build();

        return stockLotRepository.save(lot);
    }

    /**
     * Consumes {@code quantity} units from a product's open lots in FIFO order and reports what
     * each lot contributed.
     *
     * <p>The walk is the whole algorithm: take as much as possible from the oldest open lot,
     * and if that lot runs out before the request is satisfied, continue into the next one. A
     * single OUT movement therefore commonly spans several lots at different unit costs, and the
     * cost of goods sold is the sum of those lines — not quantity multiplied by any one price.
     *
     * <p><b>Nothing is consumed unless everything can be.</b> Availability is checked up front,
     * before any lot is touched, so an oversized request cannot leave the earliest lots
     * partially drained. Combined with the caller's transaction this makes the operation
     * all-or-nothing.
     *
     * @param lots     the product's open lots, oldest first, already locked by the caller
     * @return one entry per lot that contributed, in consumption order
     * @throws InsufficientStockException if the lots together hold fewer units than requested
     */
    public List<LotConsumptionDto> consumeStock(Product product, List<StockLot> lots, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Consumed quantity must be positive, was: " + quantity);
        }

        int available = lots.stream().mapToInt(StockLot::getRemainingQuantity).sum();
        if (available < quantity) {
            throw new InsufficientStockException(product.getName(), quantity, available);
        }

        List<LotConsumptionDto> consumptions = new ArrayList<>();
        int outstanding = quantity;

        for (StockLot lot : lots) {
            if (outstanding == 0) {
                break;
            }
            int taken = lot.consume(Math.min(outstanding, lot.getRemainingQuantity()));
            outstanding -= taken;

            consumptions.add(new LotConsumptionDto(
                    lot.getId(),
                    taken,
                    lot.getUnitCost(),
                    lot.getUnitCost().multiply(BigDecimal.valueOf(taken)),
                    lot.getReceivedAt(),
                    lot.getRemainingQuantity()
            ));
        }

        stockLotRepository.saveAll(lots);
        return consumptions;
    }

    /**
     * Cost of goods sold for a consumption: the sum of its per-lot lines.
     *
     * <p>Summing the lines rather than recomputing from a single price is the point of the whole
     * mechanism — it is what makes the figure reproducible and auditable against the lots it
     * actually came from.
     */
    public BigDecimal calculateCogs(List<LotConsumptionDto> consumptions) {
        return consumptions.stream()
                .map(LotConsumptionDto::lineCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Restores units to the lots they were taken from, used when reversing an OUT movement.
     *
     * <p>Returning stock to its original lots — rather than opening a new one at today's price —
     * is what makes a reversal a true undo. Creating a fresh lot would put the returned units at
     * the back of the FIFO queue and would change the product's valuation, so the correction
     * would leave a different financial position than the one before the mistake.
     */
    public void restoreConsumedLots(List<LotConsumptionDto> originalConsumptions) {
        for (LotConsumptionDto consumption : originalConsumptions) {
            stockLotRepository.findById(consumption.lotId()).ifPresent(lot -> {
                lot.setRemainingQuantity(lot.getRemainingQuantity() + consumption.quantityTaken());
                stockLotRepository.save(lot);
            });
        }
    }

    /** Units physically on hand, summed from the open lots — the authoritative figure. */
    public int currentStock(Long productId) {
        return stockLotRepository.sumRemainingQuantity(productId);
    }

    /** Direction helper kept next to the rules it belongs to. */
    public boolean isInbound(MovementType type) {
        return type == MovementType.IN;
    }
}
