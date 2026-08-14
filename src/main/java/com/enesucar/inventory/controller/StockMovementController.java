package com.enesucar.inventory.controller;

import com.enesucar.inventory.entity.MovementType;
import com.enesucar.inventory.entity.StockMovement;
import com.enesucar.inventory.service.StockMovementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouse")
public class StockMovementController {

    @Autowired
    private StockMovementService stockMovementService;

    @GetMapping("/movements")
    public List<StockMovement> getAllMovements() {
        return stockMovementService.getAllMovements();
    }

    @PostMapping("/movements")
    public StockMovement recordMovement(
            @RequestParam Long produktId,
            @RequestParam Integer quantity,
            @RequestParam MovementType type) {
        return stockMovementService.recordMovement(produktId, quantity, type);
    }
}
