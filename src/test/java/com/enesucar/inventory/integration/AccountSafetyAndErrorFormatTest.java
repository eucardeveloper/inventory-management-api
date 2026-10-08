package com.enesucar.inventory.integration;

import com.enesucar.inventory.DockerAvailableCondition;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Account rules and the error format, against the real filter chain and the real schema:
 * a STAFF user may change their own password (and only theirs), the last ADMIN cannot be demoted,
 * API docs are not public, and every failure answers with the same problem+json shape.
 */
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.locations=classpath:db/migration,classpath:db/demo",
        "app.login-rate-limit.max-attempts=1000"
})
@AutoConfigureMockMvc
@Testcontainers
@ExtendWith(DockerAvailableCondition.class)
@ActiveProfiles("test")
@DisplayName("Account safety and error format")
class AccountSafetyAndErrorFormatTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    private static final String PROBLEM_JSON = "application/problem+json";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    private int loginStatus(String username, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andReturn().getResponse().getStatus();
    }

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    private void registerStaff(String adminToken, String username, String password) throws Exception {
        mvc.perform(post("/api/auth/register").header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\",\"role\":\"STAFF\"}"))
                .andExpect(status().isOk());
    }

    private long idOf(String username) {
        Long id = jdbc.queryForObject("SELECT id FROM app_user WHERE username = ?", Long.class, username);
        assertThat(id).isNotNull();
        return id;
    }

    // ---- own password -----------------------------------------------------------------

    @Test
    @DisplayName("STAFF changes their own password via /me/password; the old one stops working")
    void staffChangesOwnPassword() throws Exception {
        String admin = login("admin", "admin123");
        registerStaff(admin, "pw.me", "password123");
        String token = login("pw.me", "password123");

        mvc.perform(patch("/api/users/me/password").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"brand-new-456\"}"))
                .andExpect(status().isNoContent());

        assertThat(loginStatus("pw.me", "password123")).isEqualTo(401);
        assertThat(loginStatus("pw.me", "brand-new-456")).isEqualTo(200);
    }

    @Test
    @DisplayName("STAFF changes their own password via /{id}/password too")
    void staffChangesOwnPasswordById() throws Exception {
        String admin = login("admin", "admin123");
        registerStaff(admin, "pw.byid", "password123");
        String token = login("pw.byid", "password123");

        mvc.perform(patch("/api/users/" + idOf("pw.byid") + "/password").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"brand-new-789\"}"))
                .andExpect(status().isNoContent());

        assertThat(loginStatus("pw.byid", "brand-new-789")).isEqualTo(200);
    }

    @Test
    @DisplayName("a wrong current password is answered with 400 and changes nothing")
    void wrongCurrentPasswordChangesNothing() throws Exception {
        String admin = login("admin", "admin123");
        registerStaff(admin, "pw.wrong", "password123");
        String token = login("pw.wrong", "password123");

        mvc.perform(patch("/api/users/me/password").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"not-my-password\",\"newPassword\":\"brand-new-456\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON));

        assertThat(loginStatus("pw.wrong", "password123")).isEqualTo(200);
    }

    @Test
    @DisplayName("a too short new password fails validation with field errors")
    void shortNewPasswordIsRejected() throws Exception {
        String token = login("staff", "staff123");

        mvc.perform(patch("/api/users/me/password").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"staff123\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation Failed"))
                .andExpect(jsonPath("$.fieldErrors.newPassword").exists());
    }

    @Test
    @DisplayName("STAFF cannot change another user's password: 403")
    void staffCannotChangeAnotherUsersPassword() throws Exception {
        String token = login("staff", "staff123");

        mvc.perform(patch("/api/users/" + idOf("admin") + "/password").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"x\",\"newPassword\":\"hijacked-password\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Access Denied"));

        assertThat(loginStatus("admin", "admin123")).isEqualTo(200);
    }

    // ---- last admin -------------------------------------------------------------------

    @Test
    @DisplayName("the last ADMIN cannot be demoted: 409, role unchanged")
    void lastAdminCannotBeDemoted() throws Exception {
        String admin = login("admin", "admin123");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM app_user WHERE role = 'ADMIN'", Integer.class)).isEqualTo(1);

        mvc.perform(patch("/api/users/" + idOf("admin") + "/role").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"STAFF\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Last Administrator"));

        assertThat(jdbc.queryForObject("SELECT role FROM app_user WHERE username = 'admin'", String.class)).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("an admin cannot delete their own account")
    void adminCannotDeleteSelf() throws Exception {
        String admin = login("admin", "admin123");

        mvc.perform(delete("/api/users/" + idOf("admin")).header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest());

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM app_user WHERE username = 'admin'", Integer.class)).isEqualTo(1);
    }

    // ---- API docs ---------------------------------------------------------------------

    @Test
    @DisplayName("OpenAPI docs are never public and are not served unless enabled")
    void apiDocsAreNotPublic() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isUnauthorized());
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isUnauthorized());

        String staff = login("staff", "staff123");
        mvc.perform(get("/v3/api-docs").header("Authorization", "Bearer " + staff)).andExpect(status().isForbidden());

        // test profile does not enable springdoc: even an admin gets nothing
        String admin = login("admin", "admin123");
        mvc.perform(get("/v3/api-docs").header("Authorization", "Bearer " + admin))
                .andExpect(status().is4xxClientError());
    }

    // ---- one error format -------------------------------------------------------------

    @Test
    @DisplayName("401, 403, 404, 400 and 409 all answer with problem+json")
    void errorsShareOneFormat() throws Exception {
        String admin = login("admin", "admin123");
        String staff = login("staff", "staff123");

        mvc.perform(get("/api/products"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"));

        mvc.perform(post("/api/products").header("Authorization", "Bearer " + staff)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.title").value("Access Denied"));

        mvc.perform(get("/api/products/999999").header("Authorization", "Bearer " + admin))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.title").value("Resource Not Found"));

        mvc.perform(post("/api/products").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.name").exists());

        mvc.perform(post("/api/auth/register").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"staff\",\"password\":\"password123\",\"role\":\"STAFF\"}"))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    @DisplayName("unreadable JSON and unknown routes are problem+json as well")
    void malformedRequestsShareTheFormat() throws Exception {
        String admin = login("admin", "admin123");

        mvc.perform(post("/api/products").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400));

        mvc.perform(get("/api/does-not-exist").header("Authorization", "Bearer " + admin))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404));
    }
}
