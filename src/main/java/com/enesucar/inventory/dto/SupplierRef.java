package com.enesucar.inventory.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * A reference to an existing supplier by id, as the product form sends it
 * ({@code "supplier": {"id": 3}}). Any other supplier fields in the body are ignored.
 *
 * <p>The ignore rule has to be stated here: the application rejects unknown JSON properties everywhere else
 * ({@code spring.jackson.deserialization.fail-on-unknown-properties=true}), and the product form sends the whole
 * supplier object it picked from the list, not only its id. Without this, creating a product with a supplier
 * from the form failed with 400.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SupplierRef(Long id) {}
