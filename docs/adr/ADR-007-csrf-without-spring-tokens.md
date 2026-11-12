# ADR-007: CSRF defence without Spring's CSRF tokens

**Status:** Accepted  
**Date:** 2026-11-12  
**Author:** Enes Uçar

## Context

The JWT lives in an HttpOnly cookie (ADR-003), so the API itself is authenticated by a credential the browser attaches
automatically. That is exactly the situation CSRF is about, and the first CodeQL scan of `main` flagged
`csrf.disable()` in `SecurityConfig` ("Disabled Spring CSRF protection", high). "The API is stateless" would be the
wrong answer, because cookie authentication is not stateless in the sense that matters here.

## Decision

Spring's synchroniser-token mechanism stays off. Cross-site requests are stopped by three layers instead:

1. **`SameSite=Strict` cookies** (`CookieFactory`, `app.cookie.same-site`): a request started from another site does
   not carry the session cookie at all.
2. **`OriginCheckFilter`**: a POST, PUT, PATCH or DELETE whose `Origin` (or, when absent, `Referer`) is not in
   `app.cors.allowed-origins` is answered with 403. This includes the login endpoint.
3. **JSON-only bodies and CORS**: a cross-site HTML form cannot send `application/json`, and a cross-site script
   needs a preflight that only the allowed origins pass.

## Alternatives Rejected

| Alternative | Why rejected |
|---|---|
| Spring's CSRF token (cookie or header) | Every client, including the web app and API consumers, would have to fetch and replay a token, for a threat the layers above already close. |
| Dismiss the CodeQL alert without a record | A reviewer who sees "disabled CSRF" on a cookie-authenticated API deserves the reasoning and the tests. |

## Consequences

- A request with neither `Origin` nor `Referer` is let through (curl, server-to-server, tests). Browsers always send
  `Origin` on cross-origin writes, and such a request carries no ambient cookie from another site because of layer 1,
  so this is not a way to forge a browser request.
- The defence depends on `app.cookie.same-site` staying `Strict` and on the allowed-origins list staying short and
  explicit. Setting `APP_COOKIE_SAMESITE=None` (for a frontend on another site) weakens layer 1; layers 2 and 3 then
  carry the load, and this ADR should be revisited.
- Safe methods (GET, HEAD, OPTIONS) must stay free of side effects; the API respects that.
- The CodeQL alert is accepted as a documented design decision (dismissed in GitHub as "won't fix" with a link here).

## Kept true by

- `OriginCheckFilterTest` (7 tests): a foreign `Origin` on POST and on login answers 403, a foreign `Referer` on DELETE
  answers 403, an allowed `Origin` or `Referer` passes, a request with neither passes (documented limit), and a foreign
  `Origin` on GET passes (safe method).
- `CookieFactoryTest`: the session cookie is HttpOnly, Secure by default and `SameSite=Strict`; the local profile may
  drop only `Secure`.
