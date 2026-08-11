package com.enesucar.lagerverwaltung;

import com.enesucar.lagerverwaltung.entity.Lieferant;
import com.enesucar.lagerverwaltung.repository.LieferantRepository;
import com.enesucar.lagerverwaltung.service.LieferantService;
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
class LieferantServiceTest {

    @Mock
    private LieferantRepository lieferantRepository;

    @InjectMocks
    private LieferantService lieferantService;

    @Test
    void alleLieferanten_sollteListeZurueckgeben() {
        Lieferant l1 = new Lieferant();
        l1.setId(1L);
        l1.setFirmenname("Test Firma");

        Lieferant l2 = new Lieferant();
        l2.setId(2L);
        l2.setFirmenname("Zweite Firma");

        when(lieferantRepository.findAll()).thenReturn(Arrays.asList(l1, l2));

        List<Lieferant> result = lieferantService.alleLieferantenAbrufen();

        assertEquals(2, result.size());
        assertEquals("Test Firma", result.get(0).getFirmenname());
        verify(lieferantRepository, times(1)).findAll();
    }

    @Test
    void lieferantFinden_sollteLieferantZurueckgeben() {
        Lieferant l = new Lieferant();
        l.setId(1L);
        l.setFirmenname("Test Firma");

        when(lieferantRepository.findById(1L)).thenReturn(Optional.of(l));

        Lieferant result = lieferantService.lieferantFinden(1L);

        assertNotNull(result);
        assertEquals("Test Firma", result.getFirmenname());
        verify(lieferantRepository, times(1)).findById(1L);
    }

    @Test
    void lieferantSpeichern_sollteLieferantSpeichern() {
        Lieferant l = new Lieferant();
        l.setFirmenname("Test Firma");

        when(lieferantRepository.save(l)).thenReturn(l);

        Lieferant result = lieferantService.lieferantSpeichern(l);

        assertNotNull(result);
        assertEquals("Test Firma", result.getFirmenname());
        verify(lieferantRepository, times(1)).save(l);
    }
}