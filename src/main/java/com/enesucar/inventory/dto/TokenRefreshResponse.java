package com.enesucar.inventory.dto;

/**
 * Returned by POST /api/auth/refresh.
 * The new access token is in the Authorization-related HttpOnly cookie;
 * this body carries just enough for the client to know the new expiry.
 */
public record TokenRefreshResponse(String role, long accessTokenExpiresIn) {}
