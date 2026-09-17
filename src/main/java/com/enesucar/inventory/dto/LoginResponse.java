package com.enesucar.inventory.dto;

/**
 * Returned in the JSON body after login / register / refresh.
 *
 * The access JWT is returned in the body (for API clients like PowerShell tests)
 * AND set as HttpOnly cookie (for browser-based frontend).
 * The refresh token is set as HttpOnly cookie only.
 */
public record LoginResponse(String token, String role) {}
