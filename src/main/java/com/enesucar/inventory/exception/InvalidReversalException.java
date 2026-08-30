package com.enesucar.inventory.exception;

/** Thrown when a reversal is not permitted, e.g. the entry was already reversed. */
public class InvalidReversalException extends RuntimeException {
    public InvalidReversalException(String message) {
        super(message);
    }
}
