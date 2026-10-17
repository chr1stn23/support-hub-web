import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { ApiError, isApiError, toApiError } from '@core/api/api-error';
import { API_BASE } from '@core/api/api-config';

function readText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/** Con responseType "blob", el JSON de un error llega como un Blob: se lee y se interpreta como cualquier otro. */
async function apiErrorFromBlob(error: HttpErrorResponse): Promise<ApiError> {
  try {
    const parsed: unknown = JSON.parse(await readText(error.error as Blob));
    if (isApiError(parsed)) {
      return parsed;
    }
  } catch {
    // no era JSON: se trata como cualquier error sin cuerpo útil
  }
  return toApiError(
    new HttpErrorResponse({
      status: error.status,
      statusText: '',
      url: error.url ?? undefined,
    }),
  );
}

/** Todo error de la API llega a los componentes como un ApiError. Los de otros orígenes no se tocan. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${API_BASE}/`)) {
    return next(req);
  }
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
        return from(apiErrorFromBlob(error)).pipe(
          switchMap((apiError) => throwError(() => apiError)),
        );
      }
      return throwError(() => toApiError(error));
    }),
  );
};
