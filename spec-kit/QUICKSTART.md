# Quickstart

How to run the project locally: the **Angular storefront** (with SSR) and the **backend API** (when implemented as a separate service).

## Prerequisites

- **Node.js** — use an LTS version compatible with the Angular version pinned in the repo root `package.json` (see CLI warnings if your Node is unsupported).
- **npm** — version aligned with `packageManager` in `package.json` if specified.

## Angular application (storefront)

From the **repository root** (parent of `spec-kit/`):

```bash
npm install
npm start
```

This runs the development server (default URL is shown in the terminal, typically `http://localhost:4200/`).

### Production-style build and SSR server

After a production build, the SSR entry script is defined in `package.json` (e.g. `serve:ssr:ecommerce-platform`). Typical flow:

```bash
npm run build
npm run serve:ssr:ecommerce-platform
```

Adjust the script name if the project name in `angular.json` differs.

## Backend API

The ecommerce domain (auth, catalog, cart, checkout, admin) should be exposed by a **dedicated API** (REST or similar), separate from the Angular SSR shell.

Until that service lives in this repo:

1. Follow the API team’s or `plan/` documentation for repository location and stack.
2. Run the API per its own `README` (common patterns: `npm run start:dev`, `docker compose up`, etc.).
3. Point the Angular app at the API base URL via environment configuration when that wiring exists.

When the API is added to this monorepo, this section should be updated with exact commands and ports.

## Sanity checks

- Storefront loads in the browser without console errors on the home route.
- API health or OpenAPI docs endpoint responds when the backend is running.

For spec and architecture context, see `README.md` in this folder and `constitution/constitution.md`.
