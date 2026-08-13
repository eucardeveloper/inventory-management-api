package com.enesucar.lagerverwaltung.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "lieferant")
public class Lieferant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firmenname;

    private String kontaktperson;

    @Column(nullable = false, unique = true)
    private String email;

    private String telefon;
}