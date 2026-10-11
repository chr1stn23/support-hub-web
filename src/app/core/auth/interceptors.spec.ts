import { ApiError } from '@core/api/api-error';
import { LoginResponse } from '../api/models';
import { HttpClient, provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { sessionInterceptor} from './session.interceptor';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from './auth.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

const user = { id: 'u-1', email: 'a@b.c', fullName: 'A', active: true, roles: ['USER' as const] };
const loginResponse: LoginResponse = { tokenType: 'Bearer', expiresIn: 900, user };
const unauthorized = { status: 401, statusText: 'Unauthorized' };
const errorBody = (status: number, code: string): ApiError => ({
  timestamp: '',
  status,
  code,
  message: 'internal detail',
  path: '',
  fieldErrors: [],
});

/** Deja correr las promesas pendientes (la renovación es asíncrona). */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

const clearXsrfCookie = () => {
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
};

describe('HTTP interceptors', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([errorInterceptor, sessionInterceptor]),
          withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
        ),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    backend.verify();
    clearXsrfCookie();
  });

  function signIn(): void {
    auth.login(user.email, 'x').subscribe();
    backend.expectOne('/api/v1/auth/login').flush(loginResponse);
  }

  describe('error normalisation', () => {
    it('turns backend errors into ApiError for the caller', () => {
      let caught: unknown;
      http.get('/api/v1/tickets/1').subscribe({ error: (e: unknown) => (caught = e) });
      backend
        .expectOne('/api/v1/tickets/1')
        .flush(errorBody(409, 'TICKET_LOCKED'), { status: 409, statusText: 'Conflict' });

      expect(caught).toMatchObject({ code: 'TICKET_LOCKED', status: 409 });
    });

    it('reports a network failure as NETWORK_ERROR', () => {
      let caught: unknown;
      http.get('/api/v1/tickets').subscribe({ error: (e: unknown) => (caught = e) });
      backend.expectOne('/api/v1/tickets').error(new ProgressEvent('error'));

      expect(caught).toMatchObject({ code: 'NETWORK_ERROR' });
    });

    it('does not touch requests to other origins', () => {
      let caught: unknown;
      http.get('https://other.example.com/data').subscribe({ error: (e: unknown) => (caught = e) });
      backend
        .expectOne('https://other.example.com/data')
        .flush('x', { status: 500, statusText: 'Boom' });

      expect(caught).not.toHaveProperty('code');
    });
  });

  describe('session renewal', () => {
    it('renews the session once and retries a request that got a 401', async () => {
      signIn();
      let result: unknown;
      http.get('/api/v1/tickets').subscribe((value) => (result = value));

      backend.expectOne('/api/v1/tickets').flush(errorBody(401, 'UNAUTHORIZED'), unauthorized);
      backend.expectOne('/api/v1/auth/refresh').flush(loginResponse);
      await settle();
      backend.expectOne('/api/v1/tickets').flush({ ok: true });

      expect(result).toEqual({ ok: true });
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('shares ONE renewal between simultaneous requests', async () => {
      signIn();
      const results: Record<string, unknown> = {};
      http.get('/api/v1/a').subscribe((value) => (results['a'] = value));
      http.get('/api/v1/b').subscribe((value) => (results['b'] = value));

      backend.expectOne('/api/v1/a').flush(errorBody(401, 'UNAUTHORIZED'), unauthorized);
      backend.expectOne('/api/v1/b').flush(errorBody(401, 'UNAUTHORIZED'), unauthorized);
      backend.expectOne('/api/v1/auth/refresh').flush(loginResponse); // expectOne falla si hubiera dos renovaciones
      await settle();
      backend.expectOne('/api/v1/a').flush(1);
      backend.expectOne('/api/v1/b').flush(2);

      expect(results).toEqual({ a: 1, b: 2 });
    });

    it('expires the session when the renewal is refused', async () => {
      signIn();
      let caught: unknown;
      http.get('/api/v1/tickets').subscribe({ error: (e: unknown) => (caught = e) });

      backend.expectOne('/api/v1/tickets').flush(errorBody(401, 'UNAUTHORIZED'), unauthorized);
      backend.expectOne('/api/v1/auth/refresh').flush(errorBody(401, 'UNAUTHORIZED'), unauthorized);
      await settle();

      expect(caught).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.notice()).toBe('expired');
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
    });

    it('expires the session when the retried request is rejected again', async () => {
      signIn();
      let caught: unknown;
      http.get('/api/v1/tickets').subscribe({ error: (e: unknown) => (caught = e) });

      backend.expectOne('/api/v1/tickets').flush(errorBody(401, 'UNAUTHORIZED'), unauthorized);
      backend.expectOne('/api/v1/auth/refresh').flush(loginResponse);
      await settle();
      backend.expectOne('/api/v1/tickets').flush(errorBody(401, 'UNAUTHORIZED'), unauthorized);
      await settle();

      expect(caught).toMatchObject({ status: 401 });
      expect(auth.isAuthenticated()).toBe(false);
      backend.expectNone('/api/v1/auth/refresh'); // sin bucle: no se renueva una segunda vez
    });

    it('does not try to renew when the login itself fails', () => {
      let caught: unknown;
      auth.login('a@b.c', 'wrong').subscribe({ error: (e: unknown) => (caught = e) });
      backend
        .expectOne('/api/v1/auth/login')
        .flush(errorBody(401, 'INVALID_CREDENTIALS'), unauthorized);

      expect(caught).toMatchObject({ code: 'INVALID_CREDENTIALS' });
      backend.expectNone('/api/v1/auth/refresh');
      expect(auth.notice()).toBeNull();
    });

    it.each([403, 404, 409, 500])('does not renew on a %i', (status) => {
      signIn();
      http.get('/api/v1/tickets').subscribe({ error: () => undefined });
      backend
        .expectOne('/api/v1/tickets')
        .flush(errorBody(status, 'X'), { status, statusText: 'x' });

      backend.expectNone('/api/v1/auth/refresh');
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('does not renew requests to other origins', () => {
      signIn();
      http.get('https://other.example.com/data').subscribe({ error: () => undefined });
      backend.expectOne('https://other.example.com/data').flush('x', unauthorized);

      backend.expectNone('/api/v1/auth/refresh');
    });
  });

  describe('restoring the session at startup', () => {
    it('recovers transparently when only the access cookie has expired', async () => {
      const restoring = auth.restore();
      backend.expectOne('/api/v1/auth/me').flush(errorBody(401, 'UNAUTHORIZED'), unauthorized);
      backend.expectOne('/api/v1/auth/refresh').flush(loginResponse);
      await settle();
      backend.expectOne('/api/v1/auth/me').flush(user);
      await restoring;

      expect(auth.isAuthenticated()).toBe(true);
    });

    it('ends quietly for a visitor without any session', async () => {
      const restoring = auth.restore();
      backend.expectOne('/api/v1/auth/me').flush(errorBody(401, 'UNAUTHORIZED'), unauthorized);
      backend.expectOne('/api/v1/auth/refresh').flush(errorBody(401, 'UNAUTHORIZED'), unauthorized);
      await restoring;

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.notice()).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('CSRF', () => {
    it('repeats the XSRF-TOKEN cookie in the X-XSRF-TOKEN header on writes', () => {
      document.cookie = 'XSRF-TOKEN=abc123; path=/';
      http.post('/api/v1/tickets', {}).subscribe();

      const request = backend.expectOne('/api/v1/tickets');
      expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('abc123');
      request.flush({});
    });

    it('does not add it to reads', () => {
      document.cookie = 'XSRF-TOKEN=abc123; path=/';
      http.get('/api/v1/tickets').subscribe();

      const request = backend.expectOne('/api/v1/tickets');
      expect(request.request.headers.has('X-XSRF-TOKEN')).toBe(false);
      request.flush({});
    });

    it('never leaks it to another origin', () => {
      document.cookie = 'XSRF-TOKEN=abc123; path=/';
      http.post('https://other.example.com/data', {}).subscribe();

      const request = backend.expectOne('https://other.example.com/data');
      expect(request.request.headers.has('X-XSRF-TOKEN')).toBe(false);
      request.flush({});
    });
  });
});


