package com.enesucar.inventory.dto;

import com.enesucar.inventory.entity.Supplier;

public record SupplierResponse(
        Long id,
        String companyName,
        String contactPerson,
        String email,
        String phone
) {
    public static SupplierResponse from(Supplier s) {
        return new SupplierResponse(
                s.getId(), s.getCompanyName(), s.getContactPerson(), s.getEmail(), s.getPhone());
    }
}
