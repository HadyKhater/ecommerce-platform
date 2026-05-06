# Spec-kit overview

This folder is the **single source of truth** for how we specify, plan, and implement the ecommerce platform. It sits next to the Angular application code but does not replace it: **spec-kit captures intent and rules**; the repo root holds runnable software.

## What lives here

| Area | Purpose |
|------|--------|
| **Constitution** | Non-negotiable engineering principles everyone follows. |
| **Specify** | Product behavior: what we build for users and operators. |
| **Plan** | Architecture and technical approach (see `plan/` when populated). |
| **Tasks** | Work breakdown and delivery tracking (see `tasks/` when populated). |
| **Implement** | Guides for turning specs into code (see `implement/` when populated). |
| **Docs** | Glossary, indexes, and recorded decisions (see `docs/` when populated). |

## How to navigate

1. Read **constitution** first so implementation choices stay aligned with our standards.
2. Read **product-spec** to understand features and boundaries.
3. Use **QUICKSTART** to run the Angular app and (when present) the backend API locally.
4. As the project grows, add architecture in `plan/`, tickets or checklists in `tasks/`, and ADRs under `docs/decisions/`.

## Relationship to the codebase

- **spec-kit** = *what* and *why*, plus *how we agree to build*.
- **`src/`** and project config = *how it is actually implemented*.

When in doubt, update the spec before large code changes so reviews stay grounded in shared intent.
