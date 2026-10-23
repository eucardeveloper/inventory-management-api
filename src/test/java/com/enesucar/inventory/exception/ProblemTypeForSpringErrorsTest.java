package com.enesucar.inventory.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Spring's own MVC errors carry the project's problem type")
class ProblemTypeForSpringErrorsTest {

    private static String typeOf(HttpStatus status, ProblemDetail pd) {
        ResponseEntity<Object> result = GlobalExceptionHandler.withProjectType(ResponseEntity.status(status).body(pd));
        return ((ProblemDetail) result.getBody()).getType().toString();
    }

    @Test
    @DisplayName("405 becomes method-not-allowed instead of about:blank")
    void methodNotAllowed() {
        assertThat(typeOf(HttpStatus.METHOD_NOT_ALLOWED, ProblemDetail.forStatus(405)))
                .isEqualTo(ProblemJson.BASE + "method-not-allowed");
    }

    @Test
    @DisplayName("415 becomes unsupported-media-type")
    void unsupportedMediaType() {
        assertThat(typeOf(HttpStatus.UNSUPPORTED_MEDIA_TYPE, ProblemDetail.forStatus(415)))
                .isEqualTo(ProblemJson.BASE + "unsupported-media-type");
    }

    @Test
    @DisplayName("a type the project already set is left alone")
    void existingTypeIsKept() {
        ProblemDetail pd = ProblemDetail.forStatus(409);
        pd.setType(URI.create(ProblemJson.BASE + "insufficient-stock"));
        assertThat(typeOf(HttpStatus.CONFLICT, pd)).isEqualTo(ProblemJson.BASE + "insufficient-stock");
    }
}
