import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet, RouterLinkActive, RouterLink, NavigationEnd, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { filter } from 'rxjs';

import { AuthService } from '../../../shared/services/auth.service';

export interface SidebarItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLinkActive, RouterLink, NgClass],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly sidebarOpen = signal(true);
  readonly mobileSidebarOpen = signal(false);

  readonly sidebarItems: SidebarItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/admin' },
    { label: 'Products', icon: 'products', route: '/admin/products' },
    { label: 'Categories', icon: 'categories', route: '/admin/categories' },
    { label: 'Orders', icon: 'orders', route: '/admin/orders' },
    { label: 'Users', icon: 'users', route: '/admin/users' },
  ];

  readonly pageTitle = signal('Dashboard');

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updatePageTitle();
        this.mobileSidebarOpen.set(false);
      });
    this.updatePageTitle();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((v) => !v);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }

  private updatePageTitle(): void {
    const url = this.router.url;
    if (url.includes('/admin/products/new') || (url.includes('/admin/products/') && url.includes('/edit'))) {
      this.pageTitle.set('Product Form');
    } else if (url.includes('/admin/products')) {
      this.pageTitle.set('Products');
    } else if (url.includes('/admin/categories/new') || (url.includes('/admin/categories/') && url.includes('/edit'))) {
      this.pageTitle.set('Category Form');
    } else if (url.includes('/admin/categories')) {
      this.pageTitle.set('Categories');
    } else if (url.includes('/admin/orders')) {
      this.pageTitle.set('Orders');
    } else if (url.includes('/admin/users')) {
      this.pageTitle.set('Users');
    } else {
      this.pageTitle.set('Dashboard');
    }
  }
}
