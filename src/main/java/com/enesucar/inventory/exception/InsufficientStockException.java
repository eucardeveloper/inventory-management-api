package com.enesucar.inventory.exception;

/** Thrown when an OUT movement asks for more units than the open lots hold. */
public class InsufficientStockException extends RuntimeException {
    private final int requested;
    private final int available;

    public InsufficientStockException(String productName, int requested, int available) {
        super("Insufficient stock for '" + productName + "': requested " + requested
                + ", available " + available);
        this.requested = requested;
        this.available = available;
    }

    public int getRequested() { return requested; }
    public int getAvailable() { return available; }
}
