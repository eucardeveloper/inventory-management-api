package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.StockReportResponse;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.repository.StockLotRepository;
import com.enesucar.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StockReportService {

    private final ProductRepository       productRepository;
    private final StockMovementRepository movementRepository;
    private final StockLotRepository      lotRepository;

    @Transactional(readOnly = true)
    public List<StockReportResponse> buildReport() {
        // Summed by the database, one row per product and direction: the report no longer loads the
        // whole ledger into memory. Reversed movements and their reversals are not counted.
        Map<Long, long[]> agg = new HashMap<>();
        for (Object[] row : movementRepository.sumQuantitiesByProductAndType()) {
            long[] sums = agg.computeIfAbsent((Long) row[0], id -> new long[]{0L, 0L});
            sums[MovementType.IN == row[1] ? 0 : 1] = ((Number) row[2]).longValue();
        }

        Map<Long, BigDecimal> value = lotRepository.inventoryValueByProduct().stream()
                .collect(Collectors.toMap(r -> (Long) r[0], r -> (BigDecimal) r[1]));

        return productRepository.findAll().stream()
                .map(p -> {
                    long[] sums = agg.getOrDefault(p.getId(), new long[]{0L, 0L});
                    return StockReportResponse.of(p, sums[0], sums[1],
                            value.getOrDefault(p.getId(), BigDecimal.ZERO));
                })
                .sorted(Comparator.comparing(StockReportResponse::productName,
                        String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }
}
