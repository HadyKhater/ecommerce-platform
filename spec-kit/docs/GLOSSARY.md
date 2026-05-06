# Glossary

Definitions used across spec-kit and the ecommerce platform docs. Each term below is explained in one paragraph.

## Identity and security

**UUID**

A UUID (Universally Unique Identifier) is a 128-bit identifier, usually written as eight groups of hexadecimal digits separated by hyphens. It provides a practical way to assign opaque, collision-resistant identifiers to resources (orders, carts, correlation ids) without a single global sequence, and is often used when APIs require client- or server-generated keys that must stay stable across retries.

**RS256**

RS256 is the JOSE algorithm identifier for signing data with RSA using SHA-256. In practice it describes asymmetric JWT signing: an authorization server signs tokens with a private key, and verifiers (API gateways, resource servers, or validated clients) check signatures with the matching public key, which supports key rotation and avoids sharing symmetric secrets broadly.

**Access Token**

An access token is a short-lived credential that proves who the caller is and what they may do, typically carried on each API request (for example in an `Authorization: Bearer` header). Its lifetime is kept short so that if it leaks, exposure is bounded; it is not usually used alone for long-term sessions without a renewal path.

**Refresh Token**

A refresh token is a credential used primarily to obtain new access tokens (and sometimes a rotated refresh token) without forcing the user through a full login again. It tends to live longer than an access token and should be stored and transmitted under stricter rules, because possession often grants continued access until revocation.

## Resilience and consistency

**Idempotency Key**

An idempotency key is a unique value the client sends on a mutating request so the server can tell a deliberate retry from a new operation. When the same key is replayed, the server returns the same outcome as the first successful attempt instead of performing duplicate side effects, which is critical for payments and checkout flows over unreliable networks.

**Circuit Breaker**

A circuit breaker is a resilience pattern that stops sending traffic to a dependency that is failing repeatedly, failing fast for a cooling-off period before allowing trial calls again. It protects upstream callers and the failing service from overload and long timeouts, and is commonly implemented in gateways, service meshes, or HTTP client libraries rather than only in UI code.

**Optimistic Lock**

Optimistic locking is a concurrency strategy where each record carries a version or token (such as a revision number or ETag); updates succeed only if the version still matches what the client last read. If another writer changed the row first, the update is rejected so the client can reload and merge, avoiding lost updates without holding database locks for the whole edit.

## Angular (modern stack)

**Standalone Component**

A standalone component is an Angular component that declares its own template dependencies through an `imports` array (and optional `providers`) instead of being declared in an `NgModule`. Applications can bootstrap and route to standalone components directly, which reduces module ceremony and keeps feature boundaries explicit at the component level.

**Functional Interceptor**

A functional interceptor is an HTTP interceptor expressed as a plain function with the `HttpInterceptorFn` signature, composed with `HttpHandlerFn`, rather than as a class implementing `HttpInterceptor`. Angular registers these with `provideHttpClient` and `withInterceptors([...])`, which fits tree-shaking and avoids class-based DI boilerplate for cross-cutting HTTP behavior.

**Signal (Angular)**

In Angular, a signal is a reactive primitive created with `signal()`, with derived values from `computed()` and side effects coordinated through `effect()`. The framework tracks reads in templates and other reactive contexts so dependent UI updates stay minimal and predictable, and signals are often used for local UI state alongside or instead of some RxJS-only patterns.

## API and delivery

**PagedResponse**

PagedResponse names the typical contract for list endpoints that return a slice of items plus pagination metadata—such as page index, page size, total element count, total pages, and optional sort descriptors. Client models should mirror the backend field names so list screens can render consistently and request the next page without ad hoc parsing.

**RFC 7807**

RFC 7807 defines “Problem Details for HTTP APIs,” a standard JSON object shape for errors with fields like `type`, `title`, `status`, `detail`, and `instance`, plus extension members. APIs that adopt it give clients stable machine-readable error types and human-readable explanations, which simplifies mapping failures to UI messages and support diagnostics.

**SSR (Server-Side Rendering)**

SSR (Server-Side Rendering) means generating HTML for a page on the server before sending it to the client, as Angular Universal does for first paint and SEO. Code that runs during SSR cannot assume a browser global exists, so any DOM or storage access must be conditional or deferred until the browser bundle runs.

**isPlatformBrowser**

`isPlatformBrowser` is an Angular API used with `inject(PLATFORM_ID)` (or the equivalent helper) to test whether the current execution context is the browser. Guards around `localStorage`, `window`, `document`, and other browser-only APIs should use it so server renders and prerender steps do not throw when those objects are undefined.

---

**Related:** `../plan/architecture-plan.md`, `INDEX.md`.
