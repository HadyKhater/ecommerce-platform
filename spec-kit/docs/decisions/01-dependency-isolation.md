# ADR: Dependency Isolation Strategy

## Title

Dependency Isolation Strategy

## Date

2026-05-03

## Status

Accepted

## Context

Angular applications accumulate cross-cutting concerns—HTTP, auth, routing, and feature UIs—and without an explicit strategy, modules and components import each other freely, blur layer boundaries, and make SSR and token handling fragile. The constitution calls for inward-pointing dependencies and predictable places for technical versus domain-facing code. We need a convention that keeps features replaceable, avoids circular feature imports, and aligns with modern Angular (standalone APIs, functional HTTP interceptors) so new work does not reintroduce `NgModule`-heavy coupling or class-only patterns where functions and `inject()` suffice.

## Decision

- Rely on the **`inject()`** function for dependency resolution in services, guards, interceptors, and components where it improves clarity and testability, instead of expanding `NgModule` `providers` as the primary wiring mechanism.
- **Do not use `NgModules`** for application composition: use **standalone components** (and route-level `loadComponent` / standalone route config) so each feature declares its imports locally and the app shell stays thin.
- Register cross-cutting HTTP behavior with **functional interceptors** (`HttpInterceptorFn`) via `provideHttpClient(withInterceptors([...]))`, not class-based `HTTP_INTERCEPTORS` multi-providers unless an external library requires it.
- Retain **folder isolation** under `src/app/`: `core/` for singleton technical concerns (interceptors, guards, token storage), `shared/` for cross-feature models and API services, `features/*` for route-aligned UI; features may depend on `shared` and `core`, but not on sibling feature internals, and `core` must not depend on `features`.

## Consequences

**Pros**

- Clear ownership and review rules: misplaced imports are obvious.
- Smaller mental model for bootstrapping and lazy routes (no feature modules to synchronize).
- Functional interceptors and `inject()` align with current Angular guidance and reduce ceremony.
- SSR boundaries stay easier to enforce when browser-only code is concentrated (e.g. token storage behind platform checks).

**Cons**

- Teams familiar only with `NgModule` patterns need a short onboarding to standalone and `inject()`.
- Very small spikes that might inline `HttpClient` in a component require discipline to push calls into `shared/services` for consistency.
- Third-party libraries that assume `NgModule` imports may need thin wrapper providers or documented exceptions.

**Follow-up**

- If a new cross-cutting concern spans multiple features, document it in `shared/` or `core/` and add a follow-up ADR if the import rules need an exception (for example a shared UI kit).
