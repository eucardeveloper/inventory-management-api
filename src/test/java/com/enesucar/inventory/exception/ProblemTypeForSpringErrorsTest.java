package com.enesucar.inventory.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.context.request.ServletWebRequest;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Spring's own MVC errors carry the project's problem type")
class ProblemTypeForSpringErrorsTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final ServletWebRequest request = new ServletWebRequest(new MockHttpServletRequest());

    @Test
    @DisplayName("405 is method-not-allowed, not about:blank")
    void methodNotAllowed() throws Exception {
        ResponseEntity<Object> response = handler.handleException(new HttpRequestMethodNotSupportedException("GET"), request);
        assertThat(response.getStatusCode().value()).isEqualTo(405);
        assertThat(((ProblemDetail) response.getBody()).getType().toString())
                .isEqualTo(ProblemJson.BASE + "method-not-allowed");
    }

    @Test
    @DisplayName("415 is unsupported-media-type")
    void unsupportedMediaType() throws Exception {
        ResponseEntity<Object> response = handler.handleException(new HttpMediaTypeNotSupportedException("text/plain"), request);
        assertThat(response.getStatusCode().value()).isEqualTo(415);
        assertThat(((ProblemDetail) response.getBody()).getType().toString())
                .isEqualTo(ProblemJson.BASE + "unsupported-media-type");
    }
}
