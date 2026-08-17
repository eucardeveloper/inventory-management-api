package com.enesucar.inventory;

import com.enesucar.inventory.entity.Supplier;
import com.enesucar.inventory.repository.SupplierRepository;
import com.enesucar.inventory.repository.ProductRepository;
import com.enesucar.inventory.service.SupplierService;
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
class SupplierServiceTest {

    @Mock
    private SupplierRepository supplierRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private SupplierService supplierService;

    @Test
    void getAllSuppliers_shouldReturnList() {
        Supplier s1 = new Supplier();
        s1.setId(1L);
        s1.setCompanyName("Test Company");

        Supplier s2 = new Supplier();
        s2.setId(2L);
        s2.setCompanyName("Second Company");

        when(supplierRepository.findAll()).thenReturn(Arrays.asList(s1, s2));

        List<Supplier> result = supplierService.getAllSuppliers();

        assertEquals(2, result.size());
        assertEquals("Test Company", result.get(0).getCompanyName());
        verify(supplierRepository, times(1)).findAll();
    }

    @Test
    void findSupplier_shouldReturnSupplier() {
        Supplier s = new Supplier();
        s.setId(1L);
        s.setCompanyName("Test Company");

        when(supplierRepository.findById(1L)).thenReturn(Optional.of(s));

        Supplier result = supplierService.findSupplier(1L);

        assertNotNull(result);
        assertEquals("Test Company", result.getCompanyName());
        verify(supplierRepository, times(1)).findById(1L);
    }

    @Test
    void saveSupplier_shouldSaveSupplier() {
        Supplier s = new Supplier();
        s.setCompanyName("Test Company");

        when(supplierRepository.save(s)).thenReturn(s);

        Supplier result = supplierService.saveSupplier(s);

        assertNotNull(result);
        assertEquals("Test Company", result.getCompanyName());
        verify(supplierRepository, times(1)).save(s);
    }
}
