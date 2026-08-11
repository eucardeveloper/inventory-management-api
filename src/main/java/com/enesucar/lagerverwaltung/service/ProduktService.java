package com.enesucar.lagerverwaltung.service;

import com.enesucar.lagerverwaltung.entity.Produkt;
import com.enesucar.lagerverwaltung.exception.ResourceNotFoundException;
import com.enesucar.lagerverwaltung.repository.ProduktRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProduktService {

    private final ProduktRepository produktRepository;

    public List<Produkt> alleProdukteAbrufen() {
        return produktRepository.findAll();
    }

    public Produkt produktSpeichern(Produkt produkt) {
        return produktRepository.save(produkt);
    }

    public Produkt produktFinden(Long id) {
        return produktRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produkt nicht gefunden: " + id));
    }

    public void produktLoeschen(Long id) {
        if (!produktRepository.existsById(id)) {
            throw new ResourceNotFoundException("Produkt nicht gefunden: " + id);
        }
        produktRepository.deleteById(id);
    }
}