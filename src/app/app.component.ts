import { Component, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NgClass } from '@angular/common';

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

  /** Whether the current route is an admin route (no public navbar/footer) */
  isAdminRoute = false;

  ngOnInit(): void {
    // Subscribe to router events to detect admin routes
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        const navEnd = e as NavigationEnd;
        this.isAdminRoute = navEnd.urlAfterRedirects.startsWith('/admin');
      });
    // Set initial value
    this.isAdminRoute = this.router.url.startsWith('/admin');
  }
}
