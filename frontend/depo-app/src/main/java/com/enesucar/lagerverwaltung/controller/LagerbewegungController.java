package com.enesucar.lagerverwaltung.controller;

import com.enesucar.lagerverwaltung.entity.Bewegungsart;
import com.enesucar.lagerverwaltung.entity.Lagerbewegung;
import com.enesucar.lagerverwaltung.service.LagerbewegungService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lager")
public class LagerbewegungController {

    @Autowired
    private LagerbewegungService lagerbewegungService;

    @GetMapping("/bewegungen")
    public List<Lagerbewegung> alleBewegungen() {
        return lagerbewegungService.alleBewegungenAbrufen();
    }

    @PostMapping("/bewegungen")
    public Lagerbewegung bewegungErfassen(
            @RequestParam Long produktId,
            @RequestParam Integer menge,
            @RequestParam Bewegungsart art) {
        return lagerbewegungService.bewegungErfassen(produktId, menge, art);
    }
}