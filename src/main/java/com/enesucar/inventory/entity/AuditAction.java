package com.enesucar.inventory.entity;

public enum AuditAction {
    // Auth events
    USER_LOGIN,
    USER_LOGOUT,
    USER_REGISTER,
    TOKEN_REFRESHED,

    // User management events
    USER_ROLE_CHANGED,
    USER_PASSWORD_CHANGED,
    USER_DELETED,

    // Product events
    PRODUCT_CREATED,
    PRODUCT_UPDATED,
    PRODUCT_DEACTIVATED,

    // Supplier events
    SUPPLIER_CREATED,
    SUPPLIER_UPDATED,
    SUPPLIER_DELETED,

    // Stock events
    STOCK_IN,
    STOCK_OUT,
    STOCK_ADJUSTED
}
