package com.enesucar.lagerverwaltung;

import com.enesucar.lagerverwaltung.entity.Bewegungsart;
import com.enesucar.lagerverwaltung.entity.Lagerbewegung;
import com.enesucar.lagerverwaltung.entity.Produkt;
import com.enesucar.lagerverwaltung.repository.LagerbewegungRepository;
import com.enesucar.lagerverwaltung.repository.ProduktRepository;
import com.enesucar.lagerverwaltung.service.LagerbewegungService;
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
class LagerbewegungServiceTest {

    @Mock
    private LagerbewegungRepository lagerbewegungRepository;

    @Mock
    private ProduktRepository produktRepository;

    @InjectMocks
    private LagerbewegungService lagerbewegungService;

    @Test
    void alleBewegungenAbrufen_sollteListeZurueckgeben() {
        Lagerbewegung b1 = new Lagerbewegung();
        Lagerbewegung b2 = new Lagerbewegung();

        when(lagerbewegungRepository.findAll()).thenReturn(Arrays.asList(b1, b2));

        List<Lagerbewegung> result = lagerbewegungService.alleBewegungenAbrufen();

        assertEquals(2, result.size());
        verify(lagerbewegungRepository, times(1)).findAll();
    }

    @Test
    void bewegungErfassen_eingang_sollteBestandErhoehen() {
        Produkt produkt = new Produkt();
        produkt.setId(1L);
        produkt.setBestand(10);

        when(produktRepository.findById(1L)).thenReturn(Optional.of(produkt));
        when(lagerbewegungRepository.save(any())).thenReturn(new Lagerbewegung());

        lagerbewegungService.bewegungErfassen(1L, 5, Bewegungsart.EINGANG);

        assertEquals(15, produkt.getBestand());
        verify(produktRepository, times(1)).save(produkt);
    }

    @Test
    void bewegungErfassen_ausgang_sollteBestandVerringern() {
        Produkt produkt = new Produkt();
        produkt.setId(1L);
        produkt.setBestand(10);

        when(produktRepository.findById(1L)).thenReturn(Optional.of(produkt));
        when(lagerbewegungRepository.save(any())).thenReturn(new Lagerbewegung());

        lagerbewegungService.bewegungErfassen(1L, 3, Bewegungsart.AUSGANG);

        assertEquals(7, produkt.getBestand());
        verify(produktRepository, times(1)).save(produkt);
    }

    @Test
    void bewegungErfassen_ausgang_yetersizBestand_sollteExceptionWerfen() {
        Produkt produkt = new Produkt();
        produkt.setId(1L);
        produkt.setBestand(5);

        when(produktRepository.findById(1L)).thenReturn(Optional.of(produkt));

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                lagerbewegungService.bewegungErfassen(1L, 10, Bewegungsart.AUSGANG));

        assertEquals("Nicht genug Bestand vorhanden!", exception.getMessage());
    }
}