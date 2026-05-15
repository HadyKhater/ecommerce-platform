import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanMatchFn } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

import { AuthService } from '../../shared/services/auth.service';

/**
 * Guard that waits for router stabilization (auth resolution) before allowing route matching.
 * Used on the wildcard route to prevent it from matching during the initialization window.
 */
export const routerStabilizedGuard: CanMatchFn = () => {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  // On the server, allow matching immediately
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Wait for auth resolution before allowing wildcard route to match
  return toObservable(authService.isAuthResolved).pipe(
    filter((resolved) => resolved),
    take(1),
    map(() => true),
  );
};
