package com.enesucar.inventory.controller;

import com.enesucar.inventory.dto.CreateProductRequest;
import com.enesucar.inventory.dto.ProductResponse;
import com.enesucar.inventory.dto.StockLotResponse;
import com.enesucar.inventory.dto.UpdateProductRequest;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.entity.Supplier;
import com.enesucar.inventory.service.ProductService;
import com.enesucar.inventory.service.StockLotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Product master data, FIFO lots and reorder monitoring")
public class ProductController {

    private final ProductService productService;
    private final StockLotService stockLotService;

    @GetMapping
    @Operation(summary = "All products")
    public List<ProductResponse> getAllProducts() {
        return productService.getAllProducts().stream().map(ProductResponse::from).toList();
    }

    @GetMapping("/active")
    @Operation(summary = "Active products only", description = "Excludes deactivated products.")
    public List<ProductResponse> getActiveProducts() {
        return productService.getActiveProducts().stream().map(ProductResponse::from).toList();
    }

    @GetMapping("/low-stock")
    @Operation(
            summary = "Products at or below their reorder level",
            description = "Ordered by urgency — the furthest below its threshold comes first.")
    public List<ProductResponse> getLowStockProducts() {
        return productService.findLowStockProducts().stream().map(ProductResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "One product")
    public ProductResponse getProductById(@PathVariable Long id) {
        return ProductResponse.from(productService.findProduct(id));
    }

    @GetMapping("/{id}/lots")
    @Operation(
            summary = "FIFO layers of a product",
            description = """
                    Every lot in receipt order, with its remaining quantity and unit cost.
                    This is the data behind the lot visualisation screen; exhausted lots are
                    included so past valuations stay explainable.""")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
    public ResponseEntity<List<StockLotResponse>> getProductLots(@PathVariable Long id) {
        return ResponseEntity.ok(stockLotService.getLotsForProduct(id));
    }

    @GetMapping("/{id}/valuation")
    @Operation(
            summary = "FIFO valuation of a product",
            description = "Remaining units priced at the lot they actually came from.")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
    public ResponseEntity<Map<String, BigDecimal>> getProductValuation(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("value", stockLotService.getInventoryValue(id)));
    }

    @GetMapping("/valuation/total")
    @Operation(summary = "Total FIFO valuation of the warehouse")
    public ResponseEntity<Map<String, BigDecimal>> getTotalValuation() {
        return ResponseEntity.ok(Map.of("value", stockLotService.getTotalInventoryValue()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
    @Operation(summary = "Create a product")
    public ProductResponse createProduct(@Valid @RequestBody CreateProductRequest request) {
        Product product = new Product();
        product.setName(request.name());
        product.setArticleNumber(request.articleNumber());
        product.setDescription(request.description());
        product.setUnitPrice(request.unitPrice());
        product.setReorderLevel(request.reorderLevel());
        product.setActive(request.active());
        product.setSupplier(toSupplier(request.supplier() == null ? null : request.supplier().id()));
        return ProductResponse.from(productService.saveProduct(product));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
    @Operation(summary = "Update a product")
    public ProductResponse updateProduct(@PathVariable Long id,
                                         @Valid @RequestBody UpdateProductRequest request) {
        // Only the master-data fields can change here. Stock is deliberately not part of the
        // request: it is derived from the FIFO lots and changes only through stock movements.
        Product incoming = new Product();
        incoming.setName(request.name());
        incoming.setArticleNumber(request.articleNumber());
        incoming.setDescription(request.description());
        incoming.setUnitPrice(request.unitPrice());
        incoming.setReorderLevel(request.reorderLevel());
        incoming.setActive(request.active());
        incoming.setSupplier(toSupplier(request.supplier() == null ? null : request.supplier().id()));
        return ProductResponse.from(productService.patchProduct(id, incoming));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
    @Operation(
            summary = "Deactivate a product",
            description = """
                    Soft delete. The product is hidden from operational screens but its ledger
                    history and lots remain intact — an audit trail with holes is not one.""")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    private static Supplier toSupplier(Long supplierId) {
        if (supplierId == null) {
            return null;
        }
        Supplier ref = new Supplier();
        ref.setId(supplierId);
        return ref;
    }
}
