package com.enesucar.inventory.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.net.URI;
import java.util.LinkedHashMap;
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
 * invisible in monitoring because nothing ever returned 500. Genuine server faults are now
 * answered with a generic 500 problem (no internals leaked) and logged with their stack trace.
 *
 * <p><b>One error format.</b> Extending {@link ResponseEntityExceptionHandler} makes Spring's own
 * MVC errors (unknown route 404, unreadable JSON 400, wrong method 405, unsupported media type
 * 415, {@code ResponseStatusException}) problem+json as well. Errors raised before MVC (401/403 in
 * the security chain, 429 from the rate limiter) are written by {@link ProblemJson} with the same
 * fields.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String BASE = ProblemJson.BASE;

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

    /**
     * Two writers raced on the same row (a master-data edit versus a stock movement, or a
     * lock that could not be acquired within lock_timeout). The request was valid; the
     * client should reload and retry, so 409 rather than a generic 500.
     */
    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, PessimisticLockingFailureException.class})
    public ProblemDetail handleConcurrentModification(Exception ex) {
        return problem(HttpStatus.CONFLICT, "Concurrent Modification",
                "The record was changed by someone else at the same time. Reload and try again.",
                "concurrent-modification");
    }

    /** A unique constraint (article number, supplier e-mail) or other integrity rule was violated. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
        return problem(HttpStatus.CONFLICT, "Data Conflict",
                "The request conflicts with existing data (for example a duplicate article number or e-mail).",
                "data-conflict");
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


    @ExceptionHandler(BadCredentialsException.class)
    public ProblemDetail handleBadCredentials(BadCredentialsException ex) {
        return problem(HttpStatus.UNAUTHORIZED, "Unauthorized", "Invalid username or password", "unauthorized");
    }

    /** Removing the last ADMIN would lock everybody out of user management. */
    @ExceptionHandler(LastAdminException.class)
    public ProblemDetail handleLastAdmin(LastAdminException ex) {
        return problem(HttpStatus.CONFLICT, "Last Administrator", ex.getMessage(), "last-admin");
    }

    /** Any other authentication failure that reaches MVC (for example from method security). */
    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail handleAuthentication(AuthenticationException ex) {
        return problem(HttpStatus.UNAUTHORIZED, "Unauthorized",
                "Authentication is required to access this resource", "unauthorized");
    }

    /** Bean-validation failure of a request body: 400 with one message per offending field. */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers,
                                                                  HttpStatusCode status,
                                                                  WebRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> fieldErrors.putIfAbsent(e.getField(), e.getDefaultMessage()));

        ProblemDetail pd = problem(HttpStatus.BAD_REQUEST, "Validation Failed",
                "One or more fields are invalid", "validation-failed");
        pd.setProperty("fieldErrors", fieldErrors);
        return handleExceptionInternal(ex, pd, headers, HttpStatus.BAD_REQUEST, request);
    }

    /**
     * Safety net: anything unexpected becomes a 500 problem. The stack trace goes to the log,
     * never to the client.
     */
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "An unexpected error occurred. Please try again later.", "internal-error");
    }

    private ProblemDetail problem(HttpStatus status, String title, String detail, String typeSlug) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(title);
        pd.setType(URI.create(BASE + typeSlug));
        return pd;
    }
}
