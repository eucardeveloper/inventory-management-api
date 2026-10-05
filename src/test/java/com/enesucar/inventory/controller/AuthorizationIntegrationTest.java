package com.enesucar.inventory.controller;

import com.enesucar.inventory.service.AuditLogService;
import com.enesucar.inventory.service.AuthService;
import com.enesucar.inventory.service.ProductService;
import com.enesucar.inventory.service.StockLotService;
import com.enesucar.inventory.service.StockMovementService;
import com.enesucar.inventory.service.StockReportService;
import com.enesucar.inventory.service.SupplierService;
import com.enesucar.inventory.service.UserService;
import com.enesucar.inventory.service.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies the HTTP authorization matrix through the real Spring Security filter chain.
 *
 * <p>The service layer is mocked deliberately: these tests prove authentication and
 * authorization status codes, while service and database behavior is covered by their
 * respective tests.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthorizationIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @MockBean private AuthService authService;
    @MockBean private AuditLogService auditLogService;
    @MockBean private ProductService productService;
    @MockBean private StockLotService stockLotService;
    @MockBean private StockMovementService stockMovementService;
    @MockBean private StockReportService stockReportService;
    @MockBean private SupplierService supplierService;
    @MockBean private UserService userService;
    @MockBean private JwtService jwtService;
    @MockBean private UserDetailsService userDetailsService;

    @Test
    void allAuthenticatedRolesCanReadOperationalResources() throws Exception {
        for (String role : new String[] {"ADMIN", "WAREHOUSE_MANAGER", "STAFF"}) {
            mvc.perform(get("/api/products").with(user("tester").roles(role))).andExpect(status().isOk());
            mvc.perform(get("/api/suppliers").with(user("tester").roles(role))).andExpect(status().isOk());
            mvc.perform(get("/api/warehouse/movements").with(user("tester").roles(role)))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/warehouse/report").with(user("tester").roles(role)))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/api/products")).andExpect(status().isUnauthorized());
    }

    @Test
    void productAndSupplierManagementIsForAdminAndManager() throws Exception {
        for (String role : new String[] {"ADMIN", "WAREHOUSE_MANAGER"}) {
            mvc.perform(post("/api/products").with(user("tester").roles(role))
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isOk());
            mvc.perform(put("/api/products/1").with(user("tester").roles(role))
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isOk());
            mvc.perform(delete("/api/products/1").with(user("tester").roles(role)))
                    .andExpect(status().isNoContent());
            mvc.perform(post("/api/suppliers").with(user("tester").roles(role))
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isOk());
            mvc.perform(put("/api/suppliers/1").with(user("tester").roles(role))
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isOk());
        }
        mvc.perform(post("/api/products").with(user("tester").roles("STAFF"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/suppliers").with(user("tester").roles("STAFF"))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/products")).andExpect(status().isUnauthorized());
    }

    @Test
    void movementAndReversalRolesMatchOperationalPolicy() throws Exception {
        String movement = "{\"productId\":1,\"quantity\":1,\"movementType\":\"IN\",\"unitCost\":1}";
        String reversal = "{\"reasonCode\":\"COUNT_CORRECTION\"}";
        for (String role : new String[] {"ADMIN", "WAREHOUSE_MANAGER", "STAFF"}) {
            mvc.perform(post("/api/warehouse/movements").with(user("tester").roles(role))
                            .contentType(MediaType.APPLICATION_JSON).content(movement))
                    .andExpect(status().isCreated());
        }
        for (String role : new String[] {"ADMIN", "WAREHOUSE_MANAGER"}) {
            mvc.perform(post("/api/warehouse/movements/1/reverse").with(user("tester").roles(role))
                            .contentType(MediaType.APPLICATION_JSON).content(reversal))
                    .andExpect(status().isCreated());
        }
        mvc.perform(post("/api/warehouse/movements/1/reverse").with(user("tester").roles("STAFF"))
                        .contentType(MediaType.APPLICATION_JSON).content(reversal))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/warehouse/movements").contentType(MediaType.APPLICATION_JSON).content(movement))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void auditLogIsVisibleOnlyToAdminAndManager() throws Exception {
        when(auditLogService.search(any(), any(), any(), any(), any(), any())).thenReturn(Page.empty());
        mvc.perform(get("/api/audit").with(user("tester").roles("ADMIN"))).andExpect(status().isOk());
        mvc.perform(get("/api/audit").with(user("tester").roles("WAREHOUSE_MANAGER")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/audit").with(user("tester").roles("STAFF")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/audit")).andExpect(status().isUnauthorized());
    }

    @Test
    void userManagementIsAdminOnlyExceptPasswordChange() throws Exception {
        for (String method : new String[] {"get", "delete"}) {
            var request = method.equals("get") ? get("/api/users") : delete("/api/users/1");
            mvc.perform(request.with(user("tester").roles("ADMIN")))
                    .andExpect(method.equals("get") ? status().isOk() : status().isNoContent());
            mvc.perform(request.with(user("tester").roles("STAFF")))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(patch("/api/users/1/role").with(user("tester").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"STAFF\"}"))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/users/1/role").with(user("tester").roles("WAREHOUSE_MANAGER"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"STAFF\"}"))
                .andExpect(status().isForbidden());
        String password = "{\"newPassword\":\"new-password\"}";
        for (String role : new String[] {"ADMIN", "WAREHOUSE_MANAGER", "STAFF"}) {
            mvc.perform(patch("/api/users/1/password").with(user("tester").roles(role))
                            .contentType(MediaType.APPLICATION_JSON).content(password))
                    .andExpect(status().isNoContent());
        }
    }
}
