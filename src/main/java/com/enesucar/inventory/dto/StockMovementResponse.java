package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.MovementType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * The result of recording a stock movement.
 *
 * <p>For an OUT movement this carries the full FIFO breakdown: {@link #lotConsumptions()} lists
 * every lot that contributed units and {@link #totalCost()} is their sum — the cost of goods
 * sold for this transaction. For an IN movement the breakdown is empty and
 * {@link #createdLotId()} points at the lot that was created.
 *
 * @param id               ledger entry id
 * @param productId        product affected
 * @param productName      denormalised for display, so the UI needs no second call
 * @param articleNumber    SKU
 * @param movementType     IN or OUT
 * @param quantity         units moved (always positive; direction is carried by movementType)
 * @param occurredAt       when the movement was booked
 * @param performedBy      username of the operator, for the ledger's audit column
 * @param totalCost        IN: quantity x unit cost. OUT: FIFO cost of goods sold.
 * @param lotConsumptions  OUT only: which lots supplied the units, oldest first
 * @param createdLotId     IN only: the lot this movement created
 * @param stockAfter       units on hand after the movement, for the ledger's running balance
 * @param reversalOfId     set when this entry reverses an earlier one
 * @param reversedById     set when this entry has itself been reversed
 * @param reasonCode       why a correction was made
 */
public record StockMovementResponse(
        Long id,
        Long productId,
        String productName,
        String articleNumber,
        MovementType movementType,
        int quantity,
        LocalDateTime occurredAt,
        String performedBy,
        BigDecimal totalCost,
        List<LotConsumptionDto> lotConsumptions,
        Long createdLotId,
        int stockAfter,
        Long reversalOfId,
        Long reversedById,
        String reasonCode
) {}
