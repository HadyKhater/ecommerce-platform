import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

import { AuthService } from '../../shared/services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
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
      if (authService.isLoggedIn()) {
        return true;
      }

      // Redirect to login with the current URL as returnUrl
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }),
  );
};
