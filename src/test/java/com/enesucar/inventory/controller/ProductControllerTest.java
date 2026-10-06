package com.enesucar.inventory.controller;

import com.enesucar.inventory.entity.Product;
import com.enesucar.inventory.entity.Supplier;
import com.enesucar.inventory.service.ProductService;
import com.enesucar.inventory.service.StockLotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProductController API contract")
class ProductControllerTest {

    @Mock private ProductService productService;
    @Mock private StockLotService stockLotService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new ProductController(productService, stockLotService)).build();
    }

    private static Product product() {
        Product p = new Product();
        p.setId(5L);
        p.setVersion(2L);
        p.setName("Keyboard");
        p.setArticleNumber("KB-1");
        p.setUnitPrice(new BigDecimal("49.90"));
        p.setStock(3);
        p.setReorderLevel(10);
        p.setActive(true);
        Supplier s = new Supplier();
        s.setId(9L);
        s.setCompanyName("ACME");
        s.setEmail("a@acme.test");
        p.setSupplier(s);
        return p;
    }

    @Test
    @DisplayName("GET returns the DTO shape the frontend consumes, including lowStock")
    void get_returnsDtoShape() throws Exception {
        when(productService.findProduct(5L)).thenReturn(product());

        mvc.perform(get("/api/products/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.name").value("Keyboard"))
                .andExpect(jsonPath("$.stock").value(3))
                .andExpect(jsonPath("$.lowStock").value(true))
                .andExpect(jsonPath("$.supplier.companyName").value("ACME"));
    }

    @Test
    @DisplayName("PUT cannot write stock, version or id: they never reach the service")
    void put_ignoresStockVersionAndId() throws Exception {
        when(productService.patchProduct(eq(5L), any(Product.class))).thenReturn(product());

        mvc.perform(put("/api/products/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":99,\"version\":7,\"name\":\"Keyboard 2\",\"stock\":99999}"))
                .andExpect(status().isOk());

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productService).patchProduct(eq(5L), captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Keyboard 2");
        assertThat(captor.getValue().getStock()).isNull();
        assertThat(captor.getValue().getVersion()).isNull();
        assertThat(captor.getValue().getId()).isNull();
    }

    @Test
    @DisplayName("POST cannot set an initial stock")
    void post_ignoresStock() throws Exception {
        when(productService.saveProduct(any(Product.class))).thenReturn(product());

        mvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mouse\",\"stock\":500,\"supplier\":{\"id\":9}}"))
                .andExpect(status().isOk());

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productService).saveProduct(captor.capture());
        assertThat(captor.getValue().getStock()).isNull();
        assertThat(captor.getValue().getSupplier().getId()).isEqualTo(9L);
    }

    @Test
    @DisplayName("POST without a name is rejected with 400 before reaching the service")
    void post_blankName_returns400() throws Exception {
        mvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  \"}"))
                .andExpect(status().isBadRequest());

        verify(productService, never()).saveProduct(any());
    }

    @Test
    @DisplayName("negative price is rejected with 400")
    void post_negativePrice_returns400() throws Exception {
        mvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mouse\",\"unitPrice\":-1}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("list endpoints return DTOs")
    void list_returnsDtos() throws Exception {
        when(productService.getActiveProducts()).thenReturn(List.of(product()));

        mvc.perform(get("/api/products/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].articleNumber").value("KB-1"));
    }
}
