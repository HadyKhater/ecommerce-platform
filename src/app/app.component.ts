import { Component, inject, OnInit, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, delay, take } from 'rxjs';

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

  /** Track if the splash screen has been hidden - prevents showing again after first hide */
  private readonly splashHidden = signal(false);

  /** 
   * Combined condition for showing splash screen:
   * - Show while auth is initializing OR
   * - Show until explicitly hidden after first navigation completes
   */
  readonly showSplash = computed(() => 
    (this.authService.isInitialising() || !this.splashHidden()) && !this.splashHidden()
  );

  constructor() {
    // Effect to toggle body class for scroll lock during splash
    // Must be in constructor (injection context) not ngOnInit
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const splashActive = this.showSplash();
        if (splashActive) {
          document.body.classList.add('splash-active');
        } else {
          document.body.classList.remove('splash-active');
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

    // 2. Hide splash after FIRST navigation completes
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        take(1), // Only handle the first navigation
        delay(300) // Small delay to ensure splash is visible and rendered
      )
      .subscribe(() => {
        this.splashHidden.set(true);
      });
    
    // Set initial route detection values
    const currentUrl = this.router.url;
    const currentPath = currentUrl.split('?')[0]; // Strip query params
    this.isAdminRoute = currentPath.startsWith('/admin');
    this.isAuthPage = currentPath === '/login' || currentPath === '/register';
  }
}