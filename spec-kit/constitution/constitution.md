# Constitution

Engineering principles for the ecommerce platform. These apply to all services, the Angular client, and supporting tooling unless a written exception is approved and recorded (for example in `docs/decisions/`).

## Clean Architecture

We structure the system so that **domain rules stay independent** of frameworks, databases, and delivery mechanisms.

- **Entities and use cases** express business rules; infrastructure implements details (persistence, HTTP, messaging).
- Dependencies point **inward**: outer layers depend on inner abstractions, not the reverse.
- Tests target core behavior without requiring a live UI or database where a fake or in-memory substitute suffices.

## Separation of concerns

Each module has a **clear responsibility**. UI handles presentation and user input; application services orchestrate use cases; infrastructure handles I/O.

- Avoid “god” components or services that mix unrelated responsibilities.
- Shared code must have an obvious home (domain, application, infrastructure, or shared kernel)—not a miscellaneous grab bag.

## No business logic in the frontend

The Angular app is a **client**. It may validate input for usability and enforce presentation rules, but **authoritative business rules** (pricing, inventory, promotions, eligibility, order state transitions, etc.) live on the **server**.

- The client displays results and collects intent; the API decides what is allowed and persists truth.
- Never rely on hidden or obfuscated logic in the browser for security or financial correctness.

## API-first design

Features are specified and delivered **through stable API contracts** before or in tandem with UI work.

- Prefer versioned, documented endpoints (e.g. OpenAPI) and explicit request/response models.
- The storefront and admin UIs consume the same conceptual domain via the API, not ad hoc shortcuts.
- Breaking changes require a deliberate process (version bump, migration, or deprecation window) and should be recorded.

---

**Compliance:** Code review and architecture checks use this constitution as a baseline. Deviations need justification and, when significant, an architectural decision record.
