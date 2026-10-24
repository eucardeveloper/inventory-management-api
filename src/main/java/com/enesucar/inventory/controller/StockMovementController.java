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

import com.enesucar.inventory.exception.DuplicateMovementException;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/stock")
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
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            Authentication authentication) {

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200));
        Page<StockMovementResponse> result =
                stockMovementService.getLedger(productId, movementType, from, to, pageable);
        return ResponseEntity.ok(canSeeCost(authentication) ? result : result.map(StockMovementResponse::withoutCost));
    }

    @GetMapping("/movements/{id}")
    @Operation(summary = "One ledger entry with its FIFO breakdown")
    public ResponseEntity<StockMovementResponse> findMovement(@PathVariable Long id, Authentication authentication) {
        StockMovementResponse r = stockMovementService.findMovement(id);
        return ResponseEntity.ok(canSeeCost(authentication) ? r : r.withoutCost());
    }

    @PostMapping("/movements")
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER', 'STAFF')")
    @Operation(
            summary = "Book a stock movement",
            description = """
                    IN opens a new FIFO lot at the supplied unit cost.
                    OUT consumes open lots oldest-first and returns the per-lot breakdown that
                    makes up the cost of goods sold.
                    Supply an idempotencyKey to make the request safe to retry.""")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Movement booked"),
            @ApiResponse(responseCode = "200", description = "Retry of an already booked request: the original movement, header Idempotent-Replayed: true"),
            @ApiResponse(responseCode = "400", description = "Validation failed"),
            @ApiResponse(responseCode = "409", description = "Insufficient stock"),
            @ApiResponse(responseCode = "422", description = "Idempotency key already used by a different request"),
            @ApiResponse(responseCode = "404", description = "Product not found")
    })
    public ResponseEntity<StockMovementResponse> recordMovement(
            @Valid @RequestBody StockMovementRequest request,
            Authentication authentication) {

        String user = authentication.getName();
        // A retry of a request that already succeeded gets the original answer back, so a client
        // that timed out cannot tell it from a first call. Nothing is booked a second time.
        var replay = stockMovementService.findReplay(request, user);
        if (replay.isPresent()) {
            return replayed(replay.get(), authentication);
        }
        try {
            StockMovementResponse response = stockMovementService.recordMovement(request, user);
            return ResponseEntity.status(201).body(canSeeCost(authentication) ? response : response.withoutCost());
        } catch (DuplicateMovementException e) {
            // Two identical requests in flight at once: the second one queued behind the first on the
            // product lock and found it committed. Answer it the same way as a later retry.
            return stockMovementService.findReplay(request, user)
                    .map(r -> replayed(r, authentication))
                    .orElseThrow(() -> e);
        }
    }

    private static ResponseEntity<StockMovementResponse> replayed(StockMovementResponse original, Authentication authentication) {
        return ResponseEntity.ok()
                .header("Idempotent-Replayed", "true")
                .body(canSeeCost(authentication) ? original : original.withoutCost());
    }

    /** Cost data (what stock was bought for) is for supervisors only. */
    private static boolean canSeeCost(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_INVENTORY_MANAGER"));
    }

    @PostMapping("/movements/{id}/reverse")
    @PreAuthorize("hasAnyRole('ADMIN', 'INVENTORY_MANAGER')")
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
