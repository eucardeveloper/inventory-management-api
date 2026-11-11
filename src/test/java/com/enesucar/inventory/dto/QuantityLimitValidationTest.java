package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.MovementType;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A quantity of Integer.MAX_VALUE used to pass validation and then fail inside the transaction as an
 * HTTP 500 (found by hand against the running stack). It is now refused at the door as a 400.
 */
@DisplayName("movement quantity limit")
class QuantityLimitValidationTest {

    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    private boolean accepts(int quantity) {
        StockMovementRequest request = new StockMovementRequest();
        request.setProductId(1L);
        request.setQuantity(quantity);
        request.setMovementType(MovementType.IN);
        request.setUnitCost(BigDecimal.ONE);
        return VALIDATOR.validate(request).isEmpty();
    }

    @Test
    @DisplayName("1 up to the per-movement maximum passes, zero and anything above is refused")
    void boundaries() {
        assertThat(accepts(1)).isTrue();
        assertThat(accepts(StockMovementRequest.MAX_QUANTITY_PER_MOVEMENT)).isTrue();
        assertThat(accepts(0)).isFalse();
        assertThat(accepts(StockMovementRequest.MAX_QUANTITY_PER_MOVEMENT + 1)).isFalse();
        assertThat(accepts(Integer.MAX_VALUE)).isFalse();
    }
}
