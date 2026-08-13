package com.enesucar.lagerverwaltung.repository;

import com.enesucar.lagerverwaltung.entity.Produkt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProduktRepository extends JpaRepository<Produkt, Long> {
    List<Produkt> findByLieferantId(Long lieferantId);
}