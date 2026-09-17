package com.enesucar.inventory.controller;

import com.enesucar.inventory.dto.StockReportResponse;
import com.enesucar.inventory.service.StockReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GET /api/warehouse/report — per-product stock summary.
 *
 * <p>Delegates all data access to {@link StockReportService}, keeping the controller
 * in the HTTP layer only and the architecture layering rule satisfied.
 */
@RestController
@RequestMapping("/api/warehouse/report")
@RequiredArgsConstructor
@Tag(name = "Stock Report", description = "Aggregated stock summary per product")
public class StockReportController {

    private final StockReportService stockReportService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'STAFF')")
    @Operation(summary = "Stock report",
               description = "Returns totalIn, totalOut, currentStock and low-stock flag for every product.")
    public ResponseEntity<List<StockReportResponse>> report() {
        return ResponseEntity.ok(stockReportService.buildReport());
    }
}
