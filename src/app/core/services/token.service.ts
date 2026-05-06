import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthResponse } from '../../shared/models/auth.model';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly platformId = inject(PLATFORM_ID);

  setTokens(tokenResponse: AuthResponse): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const access = tokenResponse.accessToken?.trim() ?? '';
    const refresh = tokenResponse.refreshToken?.trim() ?? '';

    if (!access || !refresh) {
      return;
    }

    try {
      localStorage.setItem(environment.tokenKey, access);
      localStorage.setItem(environment.refreshKey, refresh);
    } catch {
      /* Persistence failures degrade to signed-out UX. */
    }
  }

  getAccessToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return localStorage.getItem(environment.tokenKey);
    } catch {
      return null;
    }
  }

  getRefreshToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return localStorage.getItem(environment.refreshKey);
    } catch {
      return null;
    }
  }

  clearTokens(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      localStorage.removeItem(environment.tokenKey);
      localStorage.removeItem(environment.refreshKey);
    } catch {
      /* noop */
    }
  }

  isAccessTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return true;
    }

    const payload = this.decodePayload(token);
    if (!payload) {
      return true;
    }

    const exp = payload['exp'];
    if (typeof exp !== 'number') {
      return true;
    }

    return Date.now() >= exp * 1000;
  }

  getUserEmailFromToken(): string | null {
    const token = this.getAccessToken();
    if (!token) {
      return null;
    }

    const payload = this.decodePayload(token);
    if (!payload) {
      return null;
    }

    const emailRaw = payload['email'];
    if (typeof emailRaw === 'string' && emailRaw.length > 0) {
      return emailRaw;
    }

    const subRaw = payload['sub'];
    if (typeof subRaw === 'string' && subRaw.length > 0) {
      return subRaw;
    }

    return null;
  }

  private decodePayload(token: string): Record<string, unknown> | null {
    const segments = token.split('.');
    if (segments.length < 2 || typeof segments[1] !== 'string') {
      return null;
    }

    const base64Url = segments[1];
    const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLength);

    try {
      if (typeof atob !== 'function') {
        return null;
      }
      const json = atob(padded);
      const parsed: unknown = JSON.parse(json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
}
