import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NgClass } from '@angular/common';

import { AuthService } from '../../../shared/services/auth.service';
import { CartService } from '../../../shared/services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgClass],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly mobileMenuOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly scrolled = signal(false);

  /** Cart item count from CartService signal */
  readonly cartItemCount = this.cartService.cartCount;

  /** User initials from full name */
  readonly userInitials = computed(() => {
    const fullName = this.authService.user()?.fullName ?? '';
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  ngOnInit(): void {
    // Load cart count if user is logged in
    if (this.authService.isLoggedIn()) {
      this.cartService.loadCart();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.scrolled.set(window.scrollY > 10);
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.closeMobileMenu();
    this.closeUserMenu();
    this.authService.logout();
  }

  navigateToProfile(): void {
    this.closeUserMenu();
    void this.router.navigate(['/profile']);
  }
}
