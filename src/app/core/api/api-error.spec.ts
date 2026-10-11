import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ApiError, isApiError, toApiError } from './api-error';

const body: ApiError = {
  timestamp: '2026-10-08T10:00:00Z',
  status: 409,
  code: 'TICKET_LOCKED',
  message: 'The ticket is locked',
  path: '/api/v1/tickets/1',
  fieldErrors: [],
};

describe('toApiError', () => {
  it('returns the backend ApiError untouched', () => {
    const error = new HttpErrorResponse({ status: 409, error: body });
    expect(toApiError(error)).toEqual(body);
  });

  it('accepts an ApiError that was already normalised', () => {
    expect(toApiError(body)).toBe(body);
  });

  it('keeps the Retry-After header of a rate-limited response', () => {
    const error = new HttpErrorResponse({
      status: 429,
      headers: new HttpHeaders({ 'Retry-After': '120' }),
      error: { ...body, status: 429, code: 'TOO_MANY_ATTEMPTS' },
    });
    expect(toApiError(error)).toMatchObject({ code: 'TOO_MANY_ATTEMPTS', retryAfterSeconds: 120 });
  });

  it('ignores a Retry-After that is not a number', () => {
    const error = new HttpErrorResponse({
      status: 429,
      headers: new HttpHeaders({ 'Retry-After': 'tomorrow' }),
      error: { ...body, status: 429, code: 'TOO_MANY_ATTEMPTS' },
    });
    expect(toApiError(error).retryAfterSeconds).toBeUndefined();
  });

  it('maps a connection failure to NETWORK_ERROR', () => {
    const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });
    expect(toApiError(error)).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('maps a 5xx without a JSON body to INTERNAL_ERROR', () => {
    const error = new HttpErrorResponse({ status: 502, error: '<html>Bad gateway</html>' });
    expect(toApiError(error)).toMatchObject({ status: 502, code: 'INTERNAL_ERROR' });
  });

  it('maps anything else to UNKNOWN_ERROR', () => {
    expect(toApiError(new Error('boom'))).toMatchObject({ code: 'UNKNOWN_ERROR' });
    expect(toApiError('weird')).toMatchObject({ code: 'UNKNOWN_ERROR' });
  });
});

describe('isApiError', () => {
  it('only accepts objects with a numeric status and a string code', () => {
    expect(isApiError(body)).toBe(true);
    expect(isApiError({ status: '409', code: 'X' })).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});