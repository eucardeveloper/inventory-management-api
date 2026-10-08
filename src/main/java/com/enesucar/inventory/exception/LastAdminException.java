package com.enesucar.inventory.exception;

/** Thrown when an operation would leave the system without any ADMIN account. */
public class LastAdminException extends RuntimeException {
    public LastAdminException(String message) {
        super(message);
    }
}
