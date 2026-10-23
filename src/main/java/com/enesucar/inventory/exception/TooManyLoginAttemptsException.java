package com.enesucar.inventory.exception;

/** Too many sign-in attempts for one account; the client may try again after {@link #getRetryAfterSeconds()}. */
public class TooManyLoginAttemptsException extends RuntimeException {

    private final long retryAfterSeconds;

    public TooManyLoginAttemptsException(long retryAfterSeconds) {
        super("Too many sign-in attempts for this account. Please try again later.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
