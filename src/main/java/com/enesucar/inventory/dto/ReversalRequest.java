package com.enesucar.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Body for reversing a booked movement.
 *
 * <p>A reason is mandatory. An append-only ledger's value comes from being able to explain
 * itself later, and a correction with no stated cause is only marginally better than a silent
 * edit — the reader can see that something was undone but not whether it was legitimate.
 */
@Getter
@Setter
public class ReversalRequest {

    @NotBlank(message = "Reason code is required for a reversal")
    private String reasonCode;
}
