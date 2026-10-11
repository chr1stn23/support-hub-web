import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE } from '@core/api/api-config';
import { AuthService } from './auth.service';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { toApiError } from '@core/api/api-error';
import { SKIP_SESSION_EXPIRY } from './http-context';

/**
 * Un 401 en una petición normal significa que el access token venció o fue revocado.
 * Se renueva la sesión UNA vez (compartida entre todas las peticiones en vuelo) y se reintenta.
 * Si la renovación falla, o el reintento vuelve a dar 401, la sesión murió.
 */
export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${API_BASE}/`)) {
    return next(req);
  }
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (toApiError(error).status !== 401 || req.context.get(SKIP_SESSION_EXPIRY)) {
        return throwError(() => error);
      }

      return from(
        auth.refreshSession().then(
          () => true,
          () => false,
        ),
      ).pipe(
        switchMap((renewed) => {
          if (!renewed) {
            auth.expireSession();
            return throwError(() => error);
          }
          // Las cookies nuevas ya están en el navegador: basta con repetir la misma petición
          return next(req).pipe(
            catchError((retryError: unknown) => {
              if (toApiError(retryError).status === 401) {
                auth.expireSession();
              }
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};