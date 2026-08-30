package com.enesucar.inventory.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One line of a FIFO consumption: how many units were taken from one specific lot, and what
 * they cost.
 *
 * <p>This is what turns FIFO from an invisible backend rule into something the warehouse can
 * see and audit. Returning only a total COGS figure would force the user to trust the number;
 * returning the breakdown lets the UI show the arithmetic — "35 units out: 20 x EUR 40.00 from
 * lot #1, 15 x EUR 42.50 from lot #2" — which is also exactly what an accountant asks for when
 * a valuation is questioned.
 *
 * @param lotId           the lot the units came from
 * @param quantityTaken   units consumed from this lot in this movement
 * @param unitCost        that lot's acquisition cost per unit
 * @param lineCost        quantityTaken x unitCost, the contribution of this lot to total COGS
 * @param lotReceivedAt   when the lot arrived, so the UI can show FIFO order
 * @param remainingAfter  units left in the lot after this consumption; 0 means it is exhausted
 */
public record LotConsumptionDto(
        Long lotId,
        int quantityTaken,
        BigDecimal unitCost,
        BigDecimal lineCost,
        LocalDateTime lotReceivedAt,
        int remainingAfter
) {}
