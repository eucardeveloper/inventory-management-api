package com.enesucar.inventory.controller;

import com.enesucar.inventory.dto.ReversalRequest;
import com.enesucar.inventory.dto.StockMovementRequest;
import com.enesucar.inventory.dto.StockMovementResponse;
import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.service.StockMovementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/warehouse")
@RequiredArgsConstructor
@Tag(name = "Stock Movements", description = "Append-only stock ledger with FIFO cost calculation")
public class StockMovementController {

    private final StockMovementService stockMovementService;

    @GetMapping("/movements")
    @Operation(
            summary = "Stock ledger",
            description = "Newest first, server-side paginated. All filters optional.")
    public ResponseEntity<Page<StockMovementResponse>> getLedger(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) MovementType movementType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {

        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(
                stockMovementService.getLedger(productId, movementType, from, to, pageable));
    }

    @GetMapping("/movements/{id}")
    @Operation(summary = "One ledger entry with its FIFO breakdown")
    public ResponseEntity<StockMovementResponse> findMovement(@PathVariable Long id) {
        return ResponseEntity.ok(stockMovementService.findMovement(id));
    }

    @PostMapping("/movements")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER', 'STAFF')")
    @Operation(
            summary = "Book a stock movement",
            description = """
                    IN opens a new FIFO lot at the supplied unit cost.
                    OUT consumes open lots oldest-first and returns the per-lot breakdown that
                    makes up the cost of goods sold.
                    Supply an idempotencyKey to make the request safe to retry.""")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Movement booked"),
            @ApiResponse(responseCode = "400", description = "Validation failed"),
            @ApiResponse(responseCode = "409", description = "Insufficient stock, or duplicate idempotency key"),
            @ApiResponse(responseCode = "404", description = "Product not found")
    })
    public ResponseEntity<StockMovementResponse> recordMovement(
            @Valid @RequestBody StockMovementRequest request,
            Authentication authentication) {

        StockMovementResponse response =
                stockMovementService.recordMovement(request, authentication.getName());
        return ResponseEntity.status(201).body(response);
    }

    @PostMapping("/movements/{id}/reverse")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
    @Operation(
            summary = "Reverse a booked movement",
            description = """
                    Appends an opposite entry linked to the original. Nothing is edited or
                    deleted — the mistake and the correction both stay in the ledger.
                    Reversing an OUT returns its units to the exact lots they came from.""")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Reversal booked"),
            @ApiResponse(responseCode = "409", description = "Already reversed, or entry is itself a reversal"),
            @ApiResponse(responseCode = "404", description = "Movement not found")
    })
    public ResponseEntity<StockMovementResponse> reverseMovement(
            @PathVariable Long id,
            @Valid @RequestBody ReversalRequest request,
            Authentication authentication) {

        StockMovementResponse response = stockMovementService.reverseMovement(
                id, request.getReasonCode(), authentication.getName());
        return ResponseEntity.status(201).body(response);
    }
}
