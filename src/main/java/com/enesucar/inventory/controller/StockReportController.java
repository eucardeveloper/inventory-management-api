package com.enesucar.inventory.controller;

import com.enesucar.inventory.dto.StockReportResponse;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.StockMovement;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.repository.StockMovementRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * GET /api/warehouse/report — per-product stock summary.
 *
 * <p>Aggregates all movements into a flat list so the dashboard can display
 * totalIn / totalOut / currentStock / isLowStock without a separate query per product.
 */
@RestController
@RequestMapping("/api/warehouse/report")
@RequiredArgsConstructor
@Tag(name = "Stock Report", description = "Aggregated stock summary per product")
public class StockReportController {

    private final ProductRepository       productRepository;
    private final StockMovementRepository movementRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'STAFF')")
    @Operation(summary = "Stock report",
               description = "Returns totalIn, totalOut, currentStock and low-stock flag for every product.")
    public ResponseEntity<List<StockReportResponse>> report() {

        // Load all movements — acceptable for a report endpoint (no pagination needed)
        List<StockMovement> movements = movementRepository.findAll();

        // Aggregate totalIn / totalOut per product id
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

        List<StockReportResponse> result = productRepository.findAll().stream()
                .map(p -> {
                    long[] sums = agg.getOrDefault(p.getId(), new long[]{0L, 0L});
                    return StockReportResponse.of(p, sums[0], sums[1]);
                })
                .sorted(Comparator.comparing(StockReportResponse::productName,
                        String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
