package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.StockLotResponse;
import com.enesucar.inventory.entity.StockLot;
import com.enesucar.inventory.repository.StockLotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/** Read-side of the FIFO model: the lot layers and the valuations derived from them. */
@Service
@RequiredArgsConstructor
public class StockLotService {

    private final StockLotRepository stockLotRepository;

    /**
     * A product's FIFO layers in receipt order — the data behind the lot visualisation screen.
     * Exhausted lots are included on purpose: the queue's history is as informative as its
     * current state, and hiding spent lots would make a past valuation impossible to explain.
     */
    @Transactional(readOnly = true)
    public List<StockLotResponse> getLotsForProduct(Long productId) {
        return stockLotRepository.findAllByProductId(productId).stream()
                .map(this::toResponse)
                .toList();
    }

    /** FIFO valuation of one product: remaining units priced at the lot they came from. */
    @Transactional(readOnly = true)
    public BigDecimal getInventoryValue(Long productId) {
        return stockLotRepository.calculateInventoryValue(productId);
    }

    /** Total warehouse valuation, for the dashboard KPI. */
    @Transactional(readOnly = true)
    public BigDecimal getTotalInventoryValue() {
        return stockLotRepository.calculateTotalInventoryValue();
    }

    private StockLotResponse toResponse(StockLot lot) {
        BigDecimal lotValue = lot.getUnitCost()
                .multiply(BigDecimal.valueOf(lot.getRemainingQuantity()));
        return new StockLotResponse(
                lot.getId(),
                lot.getQuantity(),
                lot.getRemainingQuantity(),
                lot.getUnitCost(),
                lotValue,
                lot.getReceivedAt(),
                lot.isExhausted()
        );
    }
}
