package com.enesucar.inventory.exception;

/**
 * Thrown when an idempotency key that was already used arrives with a different request (another product,
 * quantity, type, cost or user). A retry repeats the same request; a different request under the same key is
 * a client bug, and silently answering "already processed" would make the caller believe the new one was booked.
 */
public class IdempotencyKeyReuseException extends RuntimeException {
    public IdempotencyKeyReuseException(String idempotencyKey) {
        super("Idempotency key '" + idempotencyKey + "' was already used for a different request");
    }
}
