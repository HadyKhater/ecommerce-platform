import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

import { AuthService } from '../../shared/services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth resolution before checking admin status.
  // Without this, the guard runs immediately and sees isLoggedIn() as false
  // because the user hasn't been loaded yet, causing a redirect to /login.
  return toObservable(authService.isAuthResolved).pipe(
    filter((resolved) => resolved),
    take(1),
    map(() => {
      if (!authService.isLoggedIn()) {
        return router.parseUrl('/login');
      }

      return authService.isAdmin() ? true : router.parseUrl('/forbidden');
    }),
  );
};