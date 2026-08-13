package com.enesucar.lagerverwaltung;

import com.enesucar.lagerverwaltung.entity.Produkt;
import com.enesucar.lagerverwaltung.repository.ProduktRepository;
import com.enesucar.lagerverwaltung.service.ProduktService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProduktServiceTest {

    @Mock
    private ProduktRepository produktRepository;

    @InjectMocks
    private ProduktService produktService;

    @Test
    void alleProdukteAbrufen_sollteListeZurueckgeben() {
        Produkt p1 = new Produkt();
        p1.setId(1L);
        p1.setName("Laptop");

        Produkt p2 = new Produkt();
        p2.setId(2L);
        p2.setName("Maus");

        when(produktRepository.findAll()).thenReturn(Arrays.asList(p1, p2));

        List<Produkt> result = produktService.alleProdukteAbrufen();

        assertEquals(2, result.size());
        assertEquals("Laptop", result.get(0).getName());
        verify(produktRepository, times(1)).findAll();
    }

    @Test
    void produktFinden_sollteProduktZurueckgeben() {
        Produkt p = new Produkt();
        p.setId(1L);
        p.setName("Laptop");

        when(produktRepository.findById(1L)).thenReturn(Optional.of(p));

        Produkt result = produktService.produktFinden(1L);

        assertNotNull(result);
        assertEquals("Laptop", result.getName());
        verify(produktRepository, times(1)).findById(1L);
    }

    @Test
    void produktSpeichern_sollteProdukSpeichern() {
        Produkt p = new Produkt();
        p.setName("Laptop");

        when(produktRepository.save(p)).thenReturn(p);

        Produkt result = produktService.produktSpeichern(p);

        assertNotNull(result);
        assertEquals("Laptop", result.getName());
        verify(produktRepository, times(1)).save(p);
    }
}