package com.enesucar.inventory.exception;

/**
 * Thrown when a movement arrives with an idempotency key that has already been processed.
 * Carries the id of the original so the caller can return it instead of erroring — a retry
 * should be indistinguishable from the first successful call.
 */
public class DuplicateMovementException extends RuntimeException {
    private final Long existingMovementId;

    public DuplicateMovementException(String idempotencyKey, Long existingMovementId) {
        super("Movement with idempotency key '" + idempotencyKey + "' was already processed");
        this.existingMovementId = existingMovementId;
    }

    public Long getExistingMovementId() { return existingMovementId; }
}
