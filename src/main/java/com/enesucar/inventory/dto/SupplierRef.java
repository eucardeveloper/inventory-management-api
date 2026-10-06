package com.enesucar.inventory.dto;

/**
 * A reference to an existing supplier by id, as the product form sends it
 * ({@code "supplier": {"id": 3}}). Any other supplier fields in the body are ignored.
 */
public record SupplierRef(Long id) {}
