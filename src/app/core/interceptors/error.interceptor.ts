import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { ApiError } from '../../shared/models/api-error.model';
import { AuthService } from '../../shared/services/auth.service';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/** Normalizes `{ name: ["a","b"] }` ↔ `{ name: "a" }` into `Record<string, string>` for callers. */

function coerceFieldErrors(
  candidate: unknown,
): Record<string, string> | undefined {
  const rec = asRecord(candidate);
  if (!rec) {
    return undefined;
  }

  const out: Record<string, string> = {};

  for (const [field, payload] of Object.entries(rec)) {
    if (typeof payload === 'string') {
      out[field] = payload;
      continue;
    }

    if (Array.isArray(payload)) {
      const strings = payload.filter(
        (entry): entry is string => typeof entry === 'string',
      );
      if (strings.length) {
        out[field] = strings.join(' ');
      }
    }
  }

  return Object.keys(out).length ? out : undefined;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);

  const navigateSafely = (commands: Parameters<Router['navigate']>[0]) => {
    if (isPlatformBrowser(platformId)) {
      void router.navigate(commands);
    }
  };

  return next(req).pipe(
    catchError((raw: unknown) => {
      const err = raw instanceof HttpErrorResponse ? raw : null;

      if (!err) {
        return throwError(() => raw);
      }

      switch (err.status) {
        case 400: {
          const decoded =
            typeof err.error === 'string'
              ? ((): unknown => {
                  try {
                    return JSON.parse(err.error) as unknown;
                  } catch {
                    return {};
                  }
                })()
              : err.error;

          const body = asRecord(decoded);

          const type =
            typeof body?.['type'] === 'string' ? body['type'] : 'about:blank';
          const title =
            typeof body?.['title'] === 'string'
              ? body['title']
              : 'Bad request';
          const detailRaw = body?.['detail'];
          const detail =
            typeof detailRaw === 'string' ? detailRaw : String(detailRaw ?? '');
          const timestamp =
            typeof body?.['timestamp'] === 'string'
              ? body['timestamp']
              : new Date().toISOString();

          const apiError: ApiError = {
            type,
            title,
            detail,
            status: typeof body?.['status'] === 'number' ? body['status'] : 400,
            timestamp,
            errors: coerceFieldErrors(body?.['errors']),
          };

          const formatted = new HttpErrorResponse({
            error: apiError,
            headers: err.headers,
            status: err.status,
            statusText: err.statusText,
            url: err.url ?? undefined,
          });

          return throwError(() => formatted);
        }

        case 401: {
          const url = err.url ?? '';
          const isAuthUrl =
            url.includes('/auth/login') || url.includes('/auth/refresh');

          if (!isAuthUrl) {
            authService.logout();
          }

          const body = asRecord(err.error);
          const apiError: ApiError = {
            type:
              typeof body?.['type'] === 'string' ? body['type'] : 'about:blank',
            title:
              typeof body?.['title'] === 'string'
                ? body['title']
                : 'Unauthorized',
            detail:
              typeof body?.['detail'] === 'string'
                ? body['detail']
                : err.message || 'Your session has expired. Please sign in again.',
            status: 401,
            timestamp:
              typeof body?.['timestamp'] === 'string'
                ? body['timestamp']
                : new Date().toISOString(),
            errors: coerceFieldErrors(body?.['errors']),
          };

          const formatted = new HttpErrorResponse({
            error: apiError,
            headers: err.headers,
            status: err.status,
            statusText: err.statusText,
            url: err.url ?? undefined,
          });

          return throwError(() => formatted);
        }

        case 403: {
          navigateSafely(['/forbidden']);
          const apiError: ApiError = {
            type: 'about:blank',
            title: 'Forbidden',
            detail: err.message || 'Forbidden',
            status: err.status,
            timestamp: new Date().toISOString(),
          };
          const formatted = new HttpErrorResponse({
            error: apiError,
            headers: err.headers,
            status: err.status,
            statusText: err.statusText,
            url: err.url ?? undefined,
          });

          return throwError(() => formatted);
        }

        case 404: {
          navigateSafely(['/not-found']);
          const apiError: ApiError = {
            type: 'about:blank',
            title: 'Not Found',
            detail: 'The requested resource was not found.',
            status: err.status,
            timestamp: new Date().toISOString(),
          };
          const formatted = new HttpErrorResponse({
            error: apiError,
            headers: err.headers,
            status: err.status,
            statusText: err.statusText,
            url: err.url ?? undefined,
          });

          return throwError(() => formatted);
        }

        case 409: {
          const apiError: ApiError = {
            type: 'about:blank',
            title: 'Conflict',
            detail:
              'Cart was updated from another device. Refreshing...',
            status: err.status,
            timestamp: new Date().toISOString(),
          };
          const formatted = new HttpErrorResponse({
            error: apiError,
            headers: err.headers,
            status: err.status,
            statusText: err.statusText,
            url: err.url ?? undefined,
          });

          return throwError(() => formatted);
        }

        case 429: {
          const apiError: ApiError = {
            type: 'about:blank',
            title: 'Too many requests',
            detail: 'Too many requests, please wait',
            status: err.status,
            timestamp: new Date().toISOString(),
          };
          const formatted = new HttpErrorResponse({
            error: apiError,
            headers: err.headers,
            status: err.status,
            statusText: err.statusText,
            url: err.url ?? undefined,
          });

          return throwError(() => formatted);
        }

        case 503: {
          const apiError: ApiError = {
            type: 'about:blank',
            title: 'Service unavailable',
            detail: 'Service temporarily unavailable',
            status: err.status,
            timestamp: new Date().toISOString(),
          };
          const formatted = new HttpErrorResponse({
            error: apiError,
            headers: err.headers,
            status: err.status,
            statusText: err.statusText,
            url: err.url ?? undefined,
          });

          return throwError(() => formatted);
        }

        default: {
          return throwError(() => err);
        }
      }
    }),
  );
};
