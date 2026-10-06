package com.enesucar.inventory.controller;

import com.enesucar.inventory.dto.SupplierRequest;
import com.enesucar.inventory.dto.SupplierResponse;
import com.enesucar.inventory.entity.Supplier;
import com.enesucar.inventory.service.SupplierService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
@Tag(name = "Suppliers", description = "Supplier master data")
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    @Operation(summary = "All suppliers")
    public List<SupplierResponse> getAllSuppliers() {
        return supplierService.getAllSuppliers().stream().map(SupplierResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "One supplier")
    public SupplierResponse getSupplierById(@PathVariable Long id) {
        return SupplierResponse.from(supplierService.findSupplier(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
    @Operation(summary = "Create a supplier")
    public SupplierResponse createSupplier(@Valid @RequestBody SupplierRequest request) {
        return SupplierResponse.from(supplierService.saveSupplier(toEntity(new Supplier(), request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
    @Operation(summary = "Update a supplier")
    public SupplierResponse updateSupplier(@PathVariable Long id,
                                           @Valid @RequestBody SupplierRequest request) {
        Supplier existing = supplierService.findSupplier(id);
        return SupplierResponse.from(supplierService.saveSupplier(toEntity(existing, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
            summary = "Delete a supplier",
            description = "Only ADMIN may delete suppliers — removes the master record.")
    public ResponseEntity<Void> deleteSupplier(@PathVariable Long id) {
        supplierService.deleteSupplier(id);
        return ResponseEntity.noContent().build();
    }

    private static Supplier toEntity(Supplier target, SupplierRequest request) {
        target.setCompanyName(request.companyName());
        target.setContactPerson(request.contactPerson());
        target.setEmail(request.email());
        target.setPhone(request.phone());
        return target;
    }
}
