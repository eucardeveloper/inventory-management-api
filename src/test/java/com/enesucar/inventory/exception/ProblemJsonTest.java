package com.enesucar.inventory.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ProblemJson")
class ProblemJsonTest {

    @Test
    @DisplayName("writes the RFC 7807 fields with the right status and content type")
    void writesProblemBody() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        ProblemJson.write(response, 403, "Access Denied", "You may not.", "access-denied");

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentType()).startsWith("application/problem+json");
        assertThat(response.getContentAsString()).isEqualTo(
                "{\"type\":\"https://api.inventory.local/problems/access-denied\","
                + "\"title\":\"Access Denied\",\"status\":403,\"detail\":\"You may not.\"}");
    }

    @Test
    @DisplayName("escapes quotes, backslashes and control characters")
    void escapesSpecialCharacters() {
        String body = ProblemJson.body(400, "T", "say \"hi\"\\\n", "x");

        assertThat(body).contains("\"detail\":\"say \\\"hi\\\"\\\\\\n\"");
    }
}
