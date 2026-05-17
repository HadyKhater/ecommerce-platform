import { Component, inject, OnInit, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { AuthService } from './shared/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, NgClass],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Whether the current route is an admin route (no public navbar/footer) */
  isAdminRoute = false;
  
  /** Whether the current route is an auth page (login/register) — no navbar/footer */
  isAuthPage = false;

  constructor() {
    // Effect to hide CSS splash when auth initialization completes
    // Must be in constructor (injection context) not ngOnInit
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const isInitialising = this.authService.isInitialising();
        if (!isInitialising) {
          // Hide the CSS splash screen
          const preSplash = document.getElementById('pre-splash');
          if (preSplash) {
            preSplash.classList.add('hidden');
            setTimeout(() => {
              preSplash.remove();
            }, 500);
          }
        }
      }
    });
  }

  ngOnInit(): void {
    // 1. Update route flags on EVERY navigation (for navbar/footer visibility)
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd)
      )
      .subscribe((e) => {
        const navEnd = e as NavigationEnd;
        const url = navEnd.urlAfterRedirects;
        const path = url.split('?')[0]; // Strip query params
        this.isAdminRoute = path.startsWith('/admin');
        this.isAuthPage = path === '/login' || path === '/register';
      });

    // Set initial route detection values
    const currentUrl = this.router.url;
    const currentPath = currentUrl.split('?')[0]; // Strip query params
    this.isAdminRoute = currentPath.startsWith('/admin');
    this.isAuthPage = currentPath === '/login' || currentPath === '/register';
  }
}