package com.enesucar.lagerverwaltung.repository;

import com.enesucar.lagerverwaltung.entity.Lagerbewegung;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LagerbewegungRepository extends JpaRepository<Lagerbewegung, Long> {

    @EntityGraph(attributePaths = {"produkt"})
    List<Lagerbewegung> findAll();
}