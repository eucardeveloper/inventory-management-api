package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.MovementType;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The cost columns are numeric(19,4). A fifth decimal used to be rounded by the database while the
 * ledger total was computed from the unrounded value, and a value with too many digits failed with a
 * server error. Both are now refused at the door with a validation message.
 */
@DisplayName("unitCost validation")
class UnitCostValidationTest {

    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    private boolean accepts(String unitCost) {
        StockMovementRequest request = new StockMovementRequest();
        request.setProductId(1L);
        request.setQuantity(1);
        request.setMovementType(MovementType.IN);
        request.setUnitCost(new BigDecimal(unitCost));
        return VALIDATOR.validate(request).isEmpty();
    }

    @Test
    @DisplayName("up to four decimals and fifteen integer digits pass")
    void acceptsTheColumnRange() {
        assertThat(accepts("0")).isTrue();
        assertThat(accepts("12.5")).isTrue();
        assertThat(accepts("1.2345")).isTrue();
        assertThat(accepts("999999999999999.9999")).isTrue();
    }

    @Test
    @DisplayName("a fifth decimal, too many integer digits and negatives are refused")
    void refusesWhatTheColumnCannotHold() {
        assertThat(accepts("1.23456")).isFalse();
        assertThat(accepts("1000000000000000")).isFalse();
        assertThat(accepts("-1")).isFalse();
    }
}
