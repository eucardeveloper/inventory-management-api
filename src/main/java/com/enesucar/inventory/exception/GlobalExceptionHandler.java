package com.enesucar.inventory.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * Translates domain exceptions into RFC 7807 {@code application/problem+json} responses.
 *
 * <p><b>Why RFC 7807 rather than a plain string.</b> A caller that receives {@code "Insufficient
 * stock!"} with a 400 has to parse English to decide what to do. A ProblemDetail gives it a
 * stable {@code type} URI to branch on and typed extension fields to read, so the frontend can
 * render "you asked for 40, only 25 are available" without string matching. It is also a
 * standard, which means a consumer needs no bespoke documentation to handle errors.
 *
 * <p><b>What was wrong before.</b> The previous version mapped {@code RuntimeException} to 400.
 * That single line meant every unexpected failure — a null pointer, a broken database
 * connection, a bug — was reported to the client as "your request was invalid" and, worse, was
 * invisible in monitoring because nothing ever returned 500. Genuine server faults are now left
 * to Spring's default handling so they surface as 500 and get logged.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String BASE = "https://api.inventory.local/problems/";

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, "Resource Not Found", ex.getMessage(), "not-found");
    }

    /**
     * 409 rather than 400: the request itself is well formed, it conflicts with the current
     * state of the warehouse. The available quantity is attached so the UI can tell the operator
     * how much they can actually take without issuing a second request.
     */
    @ExceptionHandler(InsufficientStockException.class)
    public ProblemDetail handleInsufficientStock(InsufficientStockException ex) {
        ProblemDetail pd = problem(HttpStatus.CONFLICT, "Insufficient Stock",
                ex.getMessage(), "insufficient-stock");
        pd.setProperty("requested", ex.getRequested());
        pd.setProperty("available", ex.getAvailable());
        return pd;
    }

    /**
     * A repeated idempotency key is not an error the caller needs to fix — it means their retry
     * arrived and the original movement stands. The id of that movement is returned so the
     * client can carry on exactly as if this had been the first call.
     */
    @ExceptionHandler(DuplicateMovementException.class)
    public ProblemDetail handleDuplicate(DuplicateMovementException ex) {
        ProblemDetail pd = problem(HttpStatus.CONFLICT, "Duplicate Movement",
                ex.getMessage(), "duplicate-movement");
        pd.setProperty("existingMovementId", ex.getExistingMovementId());
        return pd;
    }

    @ExceptionHandler(InvalidReversalException.class)
    public ProblemDetail handleInvalidReversal(InvalidReversalException ex) {
        return problem(HttpStatus.CONFLICT, "Invalid Reversal", ex.getMessage(), "invalid-reversal");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        return problem(HttpStatus.BAD_REQUEST, "Invalid Argument", ex.getMessage(), "invalid-argument");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        return problem(HttpStatus.FORBIDDEN, "Access Denied",
                "You do not have permission to perform this action", "access-denied");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> fieldErrors.put(e.getField(), e.getDefaultMessage()));

        ProblemDetail pd = problem(HttpStatus.BAD_REQUEST, "Validation Failed",
                "One or more fields are invalid", "validation-failed");
        pd.setProperty("fieldErrors", fieldErrors);
        return pd;
    }

    private ProblemDetail problem(HttpStatus status, String title, String detail, String typeSlug) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(title);
        pd.setType(URI.create(BASE + typeSlug));
        return pd;
    }
}
