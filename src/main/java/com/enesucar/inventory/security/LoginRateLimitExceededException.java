package com.enesucar.inventory.security;

public class LoginRateLimitExceededException extends RuntimeException {

    public LoginRateLimitExceededException() {
        super("Too many login attempts. Try again later.");
    }
}
