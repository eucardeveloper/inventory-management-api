package com.enesucar.inventory.service;

import com.enesucar.inventory.dto.StockReportResponse;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.StockMovement;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StockReportService {

    private final ProductRepository       productRepository;
    private final StockMovementRepository movementRepository;

    @Transactional(readOnly = true)
    public List<StockReportResponse> buildReport() {
        List<StockMovement> movements = movementRepository.findAll();

        Map<Long, long[]> agg = movements.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getProduct().getId(),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    long in  = list.stream()
                                            .filter(m -> MovementType.IN  == m.getMovementType())
                                            .mapToLong(m -> m.getQuantity().longValue())
                                            .sum();
                                    long out = list.stream()
                                            .filter(m -> MovementType.OUT == m.getMovementType())
                                            .mapToLong(m -> m.getQuantity().longValue())
                                            .sum();
                                    return new long[]{in, out};
                                }
                        )
                ));

        return productRepository.findAll().stream()
                .map(p -> {
                    long[] sums = agg.getOrDefault(p.getId(), new long[]{0L, 0L});
                    return StockReportResponse.of(p, sums[0], sums[1]);
                })
                .sorted(Comparator.comparing(StockReportResponse::productName,
                        String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }
}
