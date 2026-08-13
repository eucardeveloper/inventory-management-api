package com.enesucar.lagerverwaltung.repository;

import com.enesucar.lagerverwaltung.entity.Produkt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProduktRepository extends JpaRepository<Produkt, Long> {
}
