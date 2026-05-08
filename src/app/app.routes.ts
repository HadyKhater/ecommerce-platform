import { Routes } from '@angular/router';



import { authGuard } from './core/guards/auth.guard';

import { adminGuard } from './core/guards/admin.guard';



export const routes: Routes = [

  {

    path: '',

    loadComponent: () =>

      import('./features/home/home.component').then(

        (m) => m.HomeComponent,

      ),

  },

  {

    path: 'products',

    loadComponent: () =>

      import('./features/products/product-list/product-list.component').then(

        (m) => m.ProductListComponent,

      ),

    canActivate: [authGuard],

  },

  {

    path: 'products/:id',

    loadComponent: () =>

      import('./features/products/product-detail/product-detail.component').then(

        (m) => m.ProductDetailComponent,

      ),

    canActivate: [authGuard],

  },

  {

    path: 'cart',

    loadComponent: () =>

      import('./features/cart/cart.component').then(

        (m) => m.CartComponent,

      ),

    canActivate: [authGuard],

  },

  {

    path: 'admin',

    loadComponent: () =>

      import('./features/admin/admin-layout/admin-layout.component').then(

        (m) => m.AdminLayoutComponent,

      ),

    canActivate: [adminGuard],

    children: [

      {

        path: '',

        redirectTo: 'products',

        pathMatch: 'full',

      },

      {

        path: 'products',

        loadComponent: () =>

          import('./features/admin/product-management/product-management.component').then(

            (m) => m.ProductManagementComponent,

          ),

      },

      {

        path: 'products/new',

        loadComponent: () =>

          import('./features/admin/product-management/product-form.component').then(

            (m) => m.ProductFormComponent,

          ),

      },

      {

        path: 'products/:id/edit',

        loadComponent: () =>

          import('./features/admin/product-management/product-form.component').then(

            (m) => m.ProductFormComponent,

          ),

      },

      {

        path: 'categories',

        loadComponent: () =>

          import('./features/admin/category-management/category-management.component').then(

            (m) => m.CategoryManagementComponent,

          ),

      },

      {

        path: 'categories/new',

        loadComponent: () =>

          import('./features/admin/category-management/category-form.component').then(

            (m) => m.CategoryFormComponent,

          ),

      },

      {

        path: 'categories/:id/edit',

        loadComponent: () =>

          import('./features/admin/category-management/category-form.component').then(

            (m) => m.CategoryFormComponent,

          ),

      },

      {

        path: 'orders',

        loadComponent: () =>

          import('./features/admin/placeholder/placeholder.component').then(

            (m) => m.PlaceholderComponent,

          ),

      },

      {

        path: 'users',

        loadComponent: () =>

          import('./features/admin/placeholder/placeholder.component').then(

            (m) => m.PlaceholderComponent,

          ),

      },

      {

        path: 'inventory',

        loadComponent: () =>

          import('./features/admin/inventory-management/inventory-management.component').then(

            (m) => m.InventoryManagementComponent,

          ),

      },

    ],

  },

  {

    path: 'login',

    loadComponent: () =>

      import('./features/auth/login/login.component').then(

        (m) => m.LoginComponent,

      ),

  },

  {

    path: 'register',

    loadComponent: () =>

      import('./features/auth/register/register.component').then(

        (m) => m.RegisterComponent,

      ),

  },

  {

    path: 'forbidden',

    loadComponent: () =>

      import('./features/errors/forbidden/forbidden.component').then(

        (m) => m.ForbiddenComponent,

      ),

  },

  {

    path: 'not-found',

    loadComponent: () =>

      import('./features/errors/not-found/not-found.component').then(

        (m) => m.NotFoundComponent,

      ),

  },

  {

    path: '**',

    loadComponent: () =>

      import('./features/errors/not-found/not-found.component').then(

        (m) => m.NotFoundComponent,

      ),

  },

];

