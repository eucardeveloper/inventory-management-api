package com.enesucar.lagerverwaltung.service;

import com.enesucar.lagerverwaltung.entity.Bewegungsart;
import com.enesucar.lagerverwaltung.entity.Lagerbewegung;
import com.enesucar.lagerverwaltung.entity.Produkt;
import com.enesucar.lagerverwaltung.exception.ResourceNotFoundException;
import com.enesucar.lagerverwaltung.repository.LagerbewegungRepository;
import com.enesucar.lagerverwaltung.repository.ProduktRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LagerbewegungService {

    private final LagerbewegungRepository lagerbewegungRepository;
    private final ProduktRepository produktRepository;

    public List<Lagerbewegung> alleBewegungenAbrufen() {
        return lagerbewegungRepository.findAll();
    }

    public Lagerbewegung bewegungErfassen(Long produktId, Integer menge, Bewegungsart art) {
        Produkt produkt = produktRepository.findById(produktId)
                .orElseThrow(() -> new ResourceNotFoundException("Produkt nicht gefunden: " + produktId));

        if (art == Bewegungsart.AUSGANG && produkt.getBestand() < menge) {
            throw new RuntimeException("Nicht genug Bestand vorhanden!");
        }

        if (art == Bewegungsart.EINGANG) {
            produkt.setBestand(produkt.getBestand() + menge);
        } else {
            produkt.setBestand(produkt.getBestand() - menge);
        }
        produktRepository.save(produkt);

        Lagerbewegung bewegung = new Lagerbewegung();
        bewegung.setProdukt(produkt);
        bewegung.setMenge(menge);
        bewegung.setBewegungsart(art);
        bewegung.setDatum(LocalDateTime.now());

        return lagerbewegungRepository.save(bewegung);
    }
}