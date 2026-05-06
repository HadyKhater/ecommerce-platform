import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, EMPTY, switchMap } from 'rxjs';

import { AuthService } from '../../shared/services/auth.service';
import { TokenService } from '../services/token.service';

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

function isPublicAuthPath(url: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  if (isPublicAuthPath(req.url)) {
    return next(req);
  }

  const accessToken = tokenService.getAccessToken();

  if (!accessToken) {
    return next(req);
  }

  if (!tokenService.isAccessTokenExpired()) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    });
    return next(authReq);
  }

  const refreshToken = tokenService.getRefreshToken();
  if (!refreshToken) {
    authService.logout();
    return EMPTY;
  }

  return authService.refreshTokens().pipe(
    switchMap(() => {
      const newToken = tokenService.getAccessToken();
      if (!newToken) {
        authService.logout();
        return EMPTY;
      }
      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${newToken}` },
      });
      return next(authReq);
    }),
    catchError(() => {
      authService.logout();
      return EMPTY;
    }),
  );
};
