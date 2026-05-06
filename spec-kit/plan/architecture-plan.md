# Architecture plan

High-level technical shape of the ecommerce Angular client and how it sits in the wider system. Detailed API contracts belong in OpenAPI or companion docs; this file states boundaries and cross-cutting behavior.

## System overview

```
┌─────────────────┐     HTTP (JSON)      ┌──────────────────┐     ┌─────────────────┐
│  Angular app    │ ───────────────────► │  API Gateway       │ ──► │  Microservices  │
│  (browser/SSR)  │ ◄─────────────────── │  (port 8080)       │ ◄── │  (auth, catalog,│
└─────────────────┘                      └──────────────────┘     │   cart, orders,  │
                                                                   │   payment, etc.) │
                                                                   └─────────────────┘
```

- The **Angular frontend** is the only public UI entry for storefront and admin flows covered by this repo.
- All business APIs are reached through the **API Gateway on port 8080** (path prefix and routing rules as deployed; development typically uses a proxy or environment `apiUrl` pointing at that gateway).
- **Microservices** behind the gateway own persistence, authorization decisions, and domain rules; the client never bypasses the gateway for authoritative operations.

## Clean Architecture layers (client mapping)

Clean Architecture keeps **domain** at the center and pushes **framework and I/O** to the edges. On the Angular side we mirror that spirit as follows:

| Layer | Responsibility in this project | Typical location |
|-------|--------------------------------|------------------|
| **Presentation** | Components, templates, routing, user input, visual state | `features/**`, shell (`app.component`), layout |
| **Application** | Orchestration: calling services, mapping DTOs to view models, navigation guards that reflect auth state | Feature folders + `shared/services`, `core/guards` |
| **Domain** | Types and invariants that describe the business **shape** (models); no HTTP or Angular-specific APIs in pure model files | `shared/models` |
| **Infrastructure** | HTTP client, interceptors, token storage adapters, environment configuration | `core/interceptors`, `core/services`, `app.config` wiring |

**Dependency rule:** inner layers do not import outer layers. Presentation depends on application abstractions (services); services depend on domain types and HTTP/infrastructure boundaries, not on specific components.

## JWT authentication flow

1. **Login** — User submits credentials; `AuthService` calls the gateway (`/api/auth/**`). The API returns access and refresh tokens (and optionally expiry metadata) per contract.
2. **Store tokens** — `TokenService` persists tokens in a browser-safe store (e.g. memory + refresh in secure cookie or storage strategy agreed with backend). **On the server (SSR), do not assume `localStorage` exists.**
3. **Attach on requests** — `JwtInterceptor` reads the access token and adds the `Authorization` header (e.g. `Bearer <access_token>`) for API calls to the gateway.
4. **Silent refresh** — On `401` or proactive expiry check, `AuthService` / `TokenService` coordinates a refresh call using the refresh token; on success, update stored tokens and retry the original request once (policy as implemented). On hard failure, clear session and redirect to login where appropriate.
5. **Logout** — Clear local token state, optionally call revoke/sign-out endpoint, and navigate to a public route.

Refresh and retry policies must avoid infinite loops and should align with backend token lifetimes and CORS/cookie rules.

## Service-to-route mapping

Gateway base URL is configured per environment (e.g. `http://localhost:8080`). Paths below are **logical** prefixes; versioning (`/v1/...`) may be prepended per deployment.

| Angular service | Gateway path prefix (example) | Front-end route(s) | Notes |
|-----------------|-------------------------------|--------------------|-------|
| `AuthService` | `/api/auth/**` | `/login`, `/register` | Login, register, refresh, logout |
| `ProductService` | `/api/products/**` | `/products`, `/products/:id`, `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit` | Catalog, product by id, search, admin CRUD |
| `CategoryService` | `/api/categories` | Used in product-list filters & product-form dropdown | Fetches categories (id + name) |
| `CartService` | `/api/cart/**` | — | Cart CRUD, line items |
| `OrderService` | `/api/orders/**` | — | Checkout result, order history, order detail |
| `InventoryService` | `/api/inventory/**` | — | Stock/availability if split from catalog |
| `PaymentService` | `/api/payments/**` | — | Payment intents, confirmations (server-authoritative) |

## Component / layout architecture

### Public (storefront) layout

- **AppComponent** → includes `<app-navbar>` + `<app-footer>` (hidden on `/admin/**` routes)
- **NavbarComponent** (`shared/components/navbar/`) — sticky, blur backdrop, responsive hamburger, role-aware links, cart icon with badge
- **FooterComponent** (`shared/components/footer/`) — 3-column layout, subtle top border separator

### Admin layout

- **AdminLayoutComponent** (`features/admin/admin-layout/`) — persistent left sidebar (collapsible), top bar with page title + admin avatar, `<router-outlet>` for child routes
- Admin routes are children of `/admin` with `adminGuard` on the parent

### Key components

| Component | Path | Notes |
|-----------|------|-------|
| `ProductListComponent` | `features/products/product-list/` | Hero section, filter sidebar, glassmorphism product cards, pagination |
| `ProductDetailComponent` | `features/products/product-detail/` | Single product view |
| `ProductManagementComponent` | `features/admin/product-management/` | Stats cards, search, data table with icons, pagination |
| `ProductFormComponent` | `features/admin/product-management/` | 2-col layout, category dropdown (fetched), image preview, toggle switch |
| `PlaceholderComponent` | `features/admin/placeholder/` | Placeholder for categories, orders, users admin pages |

Exact verbs and DTOs are defined in the API specification; this table is the **ownership** map for client services.

## SSR considerations

- **No `localStorage` / `sessionStorage` on the server** — During SSR, `TokenService` must not read or write browser-only APIs. Unauthenticated SSR renders are the default; personalized content may require cookies readable on the server if the backend supports it, or hydration after client bootstrap.
- **Use `isPlatformBrowser` (or `PLATFORM_ID` + `isPlatformBrowser`)** — Any code that touches `window`, `document`, or web storage runs only in the browser branch.
- **Interceptors** — Same code runs on server and client; ensure token attachment does not throw when no token or no storage exists on the server.
- **Guards** — SSR may resolve routes differently; avoid redirect loops and match the product rules for public vs protected routes.

---

**Related:** `../constitution/constitution.md`, `../tasks/tasks.md`, `../docs/GLOSSARY.md`.
