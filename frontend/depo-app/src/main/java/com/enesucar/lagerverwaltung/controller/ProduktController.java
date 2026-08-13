package com.enesucar.lagerverwaltung.controller;

import com.enesucar.lagerverwaltung.entity.Produkt;
import com.enesucar.lagerverwaltung.service.ProduktService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/produkte")
public class ProduktController {

    @Autowired
    private ProduktService produktService;

    @GetMapping
    public List<Produkt> alleProdukte() {
        return produktService.alleProdukteAbrufen();
    }

    @GetMapping("/{id}")
    public Produkt produktById(@PathVariable Long id) {
        return produktService.produktFinden(id);
    }

    @PostMapping
    public Produkt produktErstellen(@RequestBody Produkt produkt) {
        return produktService.produktSpeichern(produkt);
    }

    @PutMapping("/{id}")
    public Produkt produktAktualisieren(@PathVariable Long id, @RequestBody Produkt produkt) {
        produkt.setId(id);
        return produktService.produktSpeichern(produkt);
    }

    @DeleteMapping("/{id}")
    public void produktLoeschen(@PathVariable Long id) {
        produktService.produktLoeschen(id);
    }
}