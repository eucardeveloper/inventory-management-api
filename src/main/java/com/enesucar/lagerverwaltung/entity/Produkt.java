package com.enesucar.lagerverwaltung.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Entity
@Table(name = "produkt")

public class Produkt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String artikelnummer;

    @Column(nullable = false)
    private String name;

    private String beschreibung;

    @Column(nullable = false)
    private BigDecimal einzelpreis;

    @Column(nullable = false)
    private Integer bestand;

    @ManyToOne
    @JoinColumn(name = "lieferant_id")
    private Lieferant lieferant;

}