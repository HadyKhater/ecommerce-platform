# Implementation tasks

Trackable breakdown of the 15-step delivery plan. Update **Status** and **Files affected** as work proceeds.

---

ID: TASK-01  
Title: Project scaffold  
Status: ✅ Done  
Files affected: angular.json, tailwind.config.js, tsconfig.json, server.ts, package.json  
Dependencies: none  

---

ID: TASK-02  
Title: Environments  
Status: ✅ Done  
Files affected: `src/environments/environment.ts`, `src/environments/environment.prod.ts`, build configuration in angular.json  
Dependencies: TASK-01  

---

ID: TASK-03  
Title: TypeScript models  
Status: ✅ Done  
Files affected: `src/app/shared/models/product.model.ts` (Category, Product with categoryName, ProductSearchParams), `src/app/shared/models/auth.model.ts`, `src/app/shared/models/api-error.model.ts`, `src/app/shared/models/cart.model.ts`, `src/app/shared/models/order.model.ts`, `src/app/shared/models/payment.model.ts`  
Dependencies: TASK-02  

---

ID: TASK-04  
Title: TokenService  
Status: ✅ Done  
Files affected: `src/app/core/services/token.service.ts`, SSR-safe storage helpers  
Dependencies: TASK-03  

---

ID: TASK-05  
Title: JWT Interceptor + Error Interceptor  
Status: ✅ Done  
Files affected: `src/app/core/interceptors/jwt.interceptor.ts`, `src/app/core/interceptors/error.interceptor.ts`, `app.config.ts` (provideHttpClient withInterceptors)  
Dependencies: TASK-04  

---

ID: TASK-06  
Title: AuthService + AuthGuard + AdminGuard  
Status: ✅ Done  
Files affected: `src/app/shared/services/auth.service.ts`, `src/app/core/guards/auth.guard.ts`, `src/app/core/guards/admin.guard.ts`, routes  
Dependencies: TASK-05  

---

ID: TASK-07  
Title: Feature Services (Product, Cart, Order, Inventory, Payment)  
Status: ✅ Done  
Files affected: `src/app/shared/services/product.service.ts` (with searchProducts), `src/app/shared/services/category.service.ts`, remaining services pending backend  
Dependencies: TASK-05, TASK-06  

---

ID: TASK-08  
Title: Login + Register components  
Status: ✅ Done  
Files affected: `src/app/features/auth/login/`, `src/app/features/auth/register/`, routes  
Dependencies: TASK-06  

---

ID: TASK-09  
Title: Product List + Product Detail  
Status: ✅ Done  
Files affected: `src/app/shared/models/product.model.ts`, `src/app/shared/services/product.service.ts`, `src/app/shared/services/category.service.ts`, `src/app/features/products/product-list/product-list.component.ts`, `src/app/features/products/product-list/product-list.component.html`, `src/app/features/products/product-detail/product-detail.component.ts`, `src/app/features/products/product-detail/product-detail.component.html`, `src/app/app.routes.ts`  
Dependencies: TASK-07  

---

ID: TASK-10  
Title: Cart component  
Status: ⏳ Pending  
Files affected: `src/app/features/cart/`, routes  
Dependencies: TASK-07  

---

ID: TASK-11  
Title: Checkout (idempotency key)  
Status: ⏳ Pending  
Files affected: `src/app/features/checkout/`, order/payment service usage, idempotency header or body field per API  
Dependencies: TASK-07, TASK-10  

---

ID: TASK-12  
Title: Orders list + detail  
Status: ⏳ Pending  
Files affected: `src/app/features/orders/order-list/`, `order-detail/`, routes  
Dependencies: TASK-07  

---

ID: TASK-13  
Title: Admin product management  
Status: ✅ Done  
Files affected: `src/app/features/admin/admin-layout/admin-layout.component.ts`, `src/app/features/admin/admin-layout/admin-layout.component.html`, `src/app/features/admin/product-management/product-management.component.ts`, `src/app/features/admin/product-management/product-management.component.html`, `src/app/features/admin/product-management/product-form.component.ts`, `src/app/features/admin/product-management/product-form.component.html`, `src/app/features/admin/placeholder/placeholder.component.ts`, `src/app/features/admin/placeholder/placeholder.component.html`, `src/app/app.routes.ts`, `src/app/core/guards/admin.guard.ts`  
Dependencies: TASK-07, TASK-09  

---

ID: TASK-14  
Title: Error pages (404, 403)  
Status: ✅ Done  
Files affected: `src/app/features/errors/not-found/`, `forbidden/`, `app.routes.ts` wildcards and guard fallbacks  
Dependencies: TASK-06  

---

ID: TASK-15  
Title: App Navbar + Footer + Design System  
Status: ✅ Done  
Files affected: `src/app/shared/components/navbar/navbar.component.ts`, `src/app/shared/components/navbar/navbar.component.html`, `src/app/shared/components/footer/footer.component.ts`, `src/app/shared/components/footer/footer.component.html`, `src/app/app.component.html`, `src/app/app.component.ts`, `tailwind.config.js`, `src/styles.css`  
Dependencies: TASK-06, TASK-08  

---

**Legend:** ✅ Done · ⏳ Pending (adjust to 🔄 In progress as needed).
