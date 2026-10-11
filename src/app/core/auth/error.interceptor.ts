import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { toApiError } from '@core/api/api-error';
import { API_BASE } from '@core/api/api-config';

/** Todo error de la API llega a los componentes como un ApiError. Los de otros orígenes no se tocan. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${API_BASE}/`)) {
    return next(req);
  }

  return next(req).pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
};
