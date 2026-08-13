package com.enesucar.lagerverwaltung.controller;

import com.enesucar.lagerverwaltung.entity.Lieferant;
import com.enesucar.lagerverwaltung.service.LieferantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lieferanten")
public class LieferantController {

    @Autowired
    private LieferantService lieferantService;

    @GetMapping
    public List<Lieferant> alleLieferanten() {
        return lieferantService.alleLieferantenAbrufen();
    }

    @GetMapping("/{id}")
    public Lieferant lieferantById(@PathVariable Long id) {
        return lieferantService.lieferantFinden(id);
    }

    @PostMapping
    public Lieferant lieferantErstellen(@RequestBody Lieferant lieferant) {
        return lieferantService.lieferantSpeichern(lieferant);
    }

    @PutMapping("/{id}")
    public Lieferant lieferantAktualisieren(@PathVariable Long id, @RequestBody Lieferant lieferant) {
        lieferant.setId(id);
        return lieferantService.lieferantSpeichern(lieferant);
    }

    @DeleteMapping("/{id}")
    public void lieferantLoeschen(@PathVariable Long id) {
        lieferantService.lieferantLoeschen(id);
    }
}
