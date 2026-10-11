import { HttpErrorResponse } from '@angular/common/http';

export interface FieldErrorDetail {
  field: string;
  /** Restricción incumplida: NotBlank, Size, Pattern, Email ... */
  code: string;
  message: string;
}

export interface ApiError {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  fieldErrors: FieldErrorDetail[];
  /** Segundos de espera, cuando el servidor los indica (429). */
  retryAfterSeconds?: number;
}

export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value == null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate['status'] === 'number' && typeof candidate['code'] === 'string';
}

function synthetic(status: number, code: string, message: string): ApiError {
  return { timestamp: new Date().toISOString(), status, code, message, path: '', fieldErrors: [] };
}

function parseRetryAfter(error: HttpErrorResponse): number | undefined {
  const raw = error.headers?.get('Retry-After');
  const seconds = raw === null || raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(seconds) ? seconds : undefined;
}

/** Cualquier cosa que falle al llamar a la API termina siendo un ApiError. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof HttpErrorResponse) {
    const retryAfter = parseRetryAfter(error);
    if (isApiError(error.error)) {
      return retryAfter === undefined
        ? error.error
        : { ...error.error, retryAfterSeconds: retryAfter };
    }
    if (error.status === 0) {
      return synthetic(0, 'NETWORK_ERROR', 'No response from the server');
    }
    return synthetic(
      error.status,
      error.status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN_ERROR',
      error.message,
    );
  }

  return synthetic(-1, 'UNKNOWN_ERROR', error instanceof Error ? error.message : 'Unknown error');
}
