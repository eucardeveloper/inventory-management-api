package com.enesucar.inventory.controller;

import com.enesucar.inventory.dto.StockLotResponse;
import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.service.ProductService;
import com.enesucar.inventory.service.StockLotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
    public List<Product> getAllProducts() {
        return productService.getAllProducts();
    }

    @GetMapping("/active")
    @Operation(summary = "Active products only", description = "Excludes deactivated products.")
    public List<Product> getActiveProducts() {
        return productService.getActiveProducts();
    }

    @GetMapping("/low-stock")
    @Operation(
            summary = "Products at or below their reorder level",
            description = "Ordered by urgency — the furthest below its threshold comes first.")
    public List<Product> getLowStockProducts() {
        return productService.findLowStockProducts();
    }

    @GetMapping("/{id}")
    @Operation(summary = "One product")
    public Product getProductById(@PathVariable Long id) {
        return productService.findProduct(id);
    }

    @GetMapping("/{id}/lots")
    @Operation(
            summary = "FIFO layers of a product",
            description = """
                    Every lot in receipt order, with its remaining quantity and unit cost.
                    This is the data behind the lot visualisation screen; exhausted lots are
                    included so past valuations stay explainable.""")
    public ResponseEntity<List<StockLotResponse>> getProductLots(@PathVariable Long id) {
        return ResponseEntity.ok(stockLotService.getLotsForProduct(id));
    }

    @GetMapping("/{id}/valuation")
    @Operation(
            summary = "FIFO valuation of a product",
            description = "Remaining units priced at the lot they actually came from.")
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
    public Product createProduct(@RequestBody Product product) {
        return productService.saveProduct(product);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'WAREHOUSE_MANAGER')")
    @Operation(summary = "Update a product")
    public Product updateProduct(@PathVariable Long id, @RequestBody Product product) {
        product.setId(id);
        return productService.saveProduct(product);
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
}
