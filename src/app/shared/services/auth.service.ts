import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, EMPTY, map, Observable, of, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenService } from '../../core/services/token.service';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserProfile,
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly httpBackend = inject(HttpBackend);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  private readonly currentUser = signal<UserProfile | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(
    () => this.currentUser()?.roles.includes('ADMIN') ?? false,
  );

  login(req: LoginRequest): Observable<void> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, req)
      .pipe(
        switchMap((response) => {
          this.tokenService.setTokens(response);
          return this.loadCurrentUser().pipe(catchError(() => of(undefined)));
        }),
        tap(() => {
          void this.router.navigate(['/products']);
        }),
      );
  }

  register(req: RegisterRequest): Observable<void> {
    return this.http
      .post<unknown>(`${environment.apiUrl}/auth/register`, req)
      .pipe(
        map(() => undefined),
        tap(() => {
          void this.router.navigate(['/auth/login']);
        }),
      );
  }

  logout(): void {
    const access = this.tokenService.getAccessToken();
    const rawHttp = new HttpClient(this.httpBackend);

    if (access) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${access}` });
      rawHttp
        .post(`${environment.apiUrl}/auth/logout`, {}, { headers })
        .pipe(catchError(() => of(undefined)))
        .subscribe();
    }

    this.tokenService.clearTokens();
    this.currentUser.set(null);
    void this.router.navigate(['/auth/login']);
  }

  refreshTokens(): Observable<void> {
    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      return of(undefined);
    }

    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, {
        refreshToken,
      })
      .pipe(
        map((response) => {
          this.tokenService.setTokens(response);
        }),
      );
  }

  loadCurrentUser(): Observable<void> {
    const email = this.tokenService.getUserEmailFromToken();
    if (!email) {
      return EMPTY;
    }

    const headers = new HttpHeaders({ 'X-User-Email': email });

    return this.http
      .get<UserProfile>(`${environment.apiUrl}/auth/me`, { headers })
      .pipe(
        tap((user) => this.currentUser.set(user)),
        map(() => undefined),
        catchError(() => EMPTY),
      );
  }

  initializeAuth(): Observable<void> {
    const accessToken = this.tokenService.getAccessToken();

    if (accessToken && !this.tokenService.isAccessTokenExpired()) {
      return this.loadCurrentUser();
    }

    const refreshToken = this.tokenService.getRefreshToken();
    if (refreshToken) {
      return this.refreshTokens().pipe(
        switchMap(() => this.loadCurrentUser()),
      );
    }

    return of(undefined);
  }
}
