package com.enesucar.lagerverwaltung.service;

import com.enesucar.lagerverwaltung.entity.Lieferant;
import com.enesucar.lagerverwaltung.exception.ResourceNotFoundException;
import com.enesucar.lagerverwaltung.repository.LieferantRepository;
import com.enesucar.lagerverwaltung.repository.ProduktRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LieferantService {

    private final LieferantRepository lieferantRepository;
    private final ProduktRepository produktRepository;

    public List<Lieferant> alleLieferantenAbrufen() {
        return lieferantRepository.findAll();
    }

    public Lieferant lieferantSpeichern(Lieferant lieferant) {
        return lieferantRepository.save(lieferant);
    }

    public Lieferant lieferantFinden(Long id) {
        return lieferantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lieferant nicht gefunden: " + id));
    }

    @Transactional
    public void lieferantLoeschen(Long id) {
        if (!lieferantRepository.existsById(id)) {
            throw new ResourceNotFoundException("Lieferant nicht gefunden: " + id);
        }
        // Bağlı ürünlerin lieferant referansını temizle
        produktRepository.findByLieferantId(id)
                .forEach(p -> p.setLieferant(null));
        lieferantRepository.deleteById(id);
    }
}