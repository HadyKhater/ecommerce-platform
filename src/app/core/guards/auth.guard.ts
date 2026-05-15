import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

import { AuthService } from '../../shared/services/auth.service';
import { TokenService } from '../services/token.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // On the server, we don't have access to localStorage tokens.
  // We let the request through and let the client handle auth resolution.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Use the isAuthResolved signal to wait for the initialization to complete.
  // This prevents the guard from redirecting to /login while we are still
  // checking for valid tokens in localStorage.
  return toObservable(authService.isAuthResolved).pipe(
    filter((resolved) => resolved),
    take(1),
    map(() => {
      // First check: is the user loaded in the service?
      if (authService.isLoggedIn()) {
        return true;
      }

      // Second check (fallback): Even if loadCurrentUser() failed (e.g., server down),
      // if we have a valid non-expired token in localStorage, allow access.
      // This prevents redirecting to login when the backend is temporarily unavailable.
      const accessToken = tokenService.getAccessToken();
      if (accessToken && !tokenService.isAccessTokenExpired()) {
        return true;
      }

      // Redirect to login with the current URL as returnUrl
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }),
  );
};
