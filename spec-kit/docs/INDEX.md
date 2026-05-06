# Spec-kit index

Navigable map of all spec-kit files. Paths are relative to the repository root. **Status** reflects whether the artifact exists and is part of the current baseline (✅ Done) or is not yet created (⏳ Pending).

| File path | One-line description | Status |
|-----------|----------------------|--------|
| `spec-kit/README.md` | Overview of the spec-kit and how it relates to the project. | ✅ Done |
| `spec-kit/QUICKSTART.md` | Fast path for new contributors to find specs and next steps. | ✅ Done |
| `spec-kit/constitution/constitution.md` | Engineering principles: Clean Architecture, API-first, no authoritative logic in the frontend. | ✅ Done |
| `spec-kit/specify/product-spec.md` | Product capabilities: auth, catalog, cart, orders, admin. | ✅ Done |
| `spec-kit/plan/architecture-plan.md` | System topology, client layers, JWT flow, service-to-route map, SSR notes. | ✅ Done |
| `spec-kit/tasks/tasks.md` | Fifteen-track implementation checklist with IDs and dependencies. | ✅ Done |
| `spec-kit/docs/GLOSSARY.md` | Paragraph definitions of security, API, and Angular terms used in specs. | ✅ Done |
| `spec-kit/docs/INDEX.md` | This file: directory of all spec-kit artifacts with status. | ✅ Done |
| `spec-kit/docs/decisions/01-dependency-isolation.md` | ADR: dependency isolation strategy (inject, standalone, functional interceptors). | ✅ Done |

---

**Maintainers:** Add new ADRs under `docs/decisions/` with the next sequential number and a new row in this table.
