package com.enesucar.lagerverwaltung.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "lagerbewegung")
public class Lagerbewegung {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "produkt_id", nullable = false)
    private Produkt produkt;

    @Column(nullable = false)
    private Integer menge;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Bewegungsart bewegungsart;

    @Column(nullable = false)
    private LocalDateTime datum;
}