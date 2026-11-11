package com.enesucar.inventory.controller;

import com.enesucar.inventory.dto.StockIntegrityResponse;
import com.enesucar.inventory.service.StockIntegrityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/stock/integrity: proves, per product, that stock, lots and ledger agree. Supervisors only. */
@RestController
@RequestMapping("/api/stock/integrity")
@RequiredArgsConstructor
@Tag(name = "Stock Integrity", description = "Cross-check of cached stock, open lots and the append-only ledger")
public class StockIntegrityController {

    private final StockIntegrityService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
    @Operation(summary = "Stock integrity check",
               description = "For every product compares the cached stock, the sum of its open lots, the net of the ledger and the last stock-after. Quantities only.")
    public ResponseEntity<StockIntegrityResponse> check(@RequestParam(defaultValue = "false") boolean onlyInconsistent) {
        return ResponseEntity.ok(service.check(onlyInconsistent));
    }
}
