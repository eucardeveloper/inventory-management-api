package com.enesucar.inventory.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "supplier")
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String companyName;

    private String contactPerson;

    @Column(nullable = false, unique = true)
    private String email;

    private String phone;
}
