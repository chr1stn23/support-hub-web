import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { LoginResponse, UserResponse } from '../api/models';
import { AuthService } from './auth.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

const user: UserResponse = {
  id: 'u-1',
  email: 'user@supporthub.local',
  fullName: 'Lucía Usuaria',
  active: true,
  roles: ['USER'],
};

// Sin accessToken: así llega en producción
const loginResponse: LoginResponse = { tokenType: 'Bearer', expiresIn: 900, user };
const unauthorized = { status: 401, statusText: 'Unauthorized' };

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  function signIn(): void {
    auth.login(user.email, 'x').subscribe();
    http.expectOne('/api/v1/auth/login').flush(loginResponse);
  }

  describe('login', () => {
    it('keeps only the person, never a token', () => {
      auth.login(user.email, 'secret').subscribe();
      const request = http.expectOne('/api/v1/auth/login');
      expect(request.request.body).toEqual({ email: user.email, password: 'secret' });
      request.flush({ ...loginResponse, accessToken: 'visible-only-in-development' });

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.hasRole('USER')).toBe(true);
      expect(auth.hasAnyRole(['ADMIN', 'AGENT'])).toBe(false);
      // La sesión vive en cookies HttpOnly: no hay nada que guardar en el navegador
      expect(sessionStorage.length).toBe(0);
      expect(localStorage.length).toBe(0);
    });

    it('clears a previous notice', () => {
      signIn();
      auth.expireSession();
      expect(auth.notice()).toBe('expired');

      signIn();
      expect(auth.notice()).toBeNull();
    });
  });

  describe('restore', () => {
    it('recovers the person from the cookies', async () => {
      const restoring = auth.restore();
      http.expectOne('/api/v1/auth/me').flush(user);
      await restoring;

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.user()?.email).toBe(user.email);
    });

    it('ends anonymous, without any notice, when there is no session', async () => {
      const restoring = auth.restore();
      http.expectOne('/api/v1/auth/me').flush({ status: 401, code: 'UNAUTHORIZED' }, unauthorized);
      await restoring;

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.notice()).toBeNull();
    });

    it('reports an unreachable server', async () => {
      const restoring = auth.restore();
      http.expectOne('/api/v1/auth/me').error(new ProgressEvent('error'));
      await restoring;

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.notice()).toBe('unavailable');
    });
  });

  describe('refreshSession', () => {
    it('takes the up-to-date person from the response (roles may have changed)', async () => {
      signIn();
      const refreshing = auth.refreshSession();
      http
        .expectOne('/api/v1/auth/refresh')
        .flush({ ...loginResponse, user: { ...user, roles: ['USER', 'AGENT'] } });
      await refreshing;

      expect(auth.hasRole('AGENT')).toBe(true);
      expect(auth.lastRefreshAt()).not.toBeNull();
    });

    it('shares one request between simultaneous callers', async () => {
      signIn();
      const first = auth.refreshSession();
      const second = auth.refreshSession();

      http.expectOne('/api/v1/auth/refresh').flush(loginResponse); // expectOne falla si hubiera dos
      await Promise.all([first, second]);
    });

    it('allows a new renewal once the previous one finished', async () => {
      signIn();
      const first = auth.refreshSession();
      http.expectOne('/api/v1/auth/refresh').flush(loginResponse);
      await first;

      const second = auth.refreshSession();
      http.expectOne('/api/v1/auth/refresh').flush(loginResponse);
      await second;
    });

    it('rejects when the server refuses the renewal', async () => {
      signIn();
      const refreshing = auth.refreshSession();
      http
        .expectOne('/api/v1/auth/refresh')
        .flush({ status: 401, code: 'UNAUTHORIZED' }, unauthorized);

      await expect(refreshing).rejects.toBeTruthy();
    });

    it('reloads the person when another tab renewed at the same time', async () => {
      vi.useFakeTimers();
      signIn();
      const refreshing = auth.refreshSession();
      http
        .expectOne('/api/v1/auth/refresh')
        .flush(
          { status: 409, code: 'CONCURRENT_REFRESH' },
          { status: 409, statusText: 'Conflict' },
        );

      await vi.advanceTimersByTimeAsync(300);
      http.expectOne('/api/v1/auth/me').flush({ ...user, roles: ['USER', 'AGENT'] });
      await refreshing;

      expect(auth.hasRole('AGENT')).toBe(true);
    });
  });

  describe('logout', () => {
    it('revokes the session on the server and leaves the page', () => {
      signIn();
      auth.logout();

      const request = http.expectOne('/api/v1/auth/logout');
      expect(request.request.method).toBe('POST');
      request.flush(null, { status: 204, statusText: 'No Content' });

      expect(auth.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('ends the session in this tab even when the server fails', () => {
      signIn();
      auth.logout();
      http.expectOne('/api/v1/auth/logout').error(new ProgressEvent('error'));

      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('expireSession', () => {
    it('warns and sends the person to the login, remembering where they were', () => {
      signIn();
      auth.expireSession();

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.notice()).toBe('expired');
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
    });

    it('does nothing when there was no session to lose', () => {
      auth.expireSession();

      expect(auth.notice()).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('is safe to call from several failing requests at once', () => {
      signIn();
      auth.expireSession();
      auth.expireSession();
      auth.expireSession();

      expect(router.navigate).toHaveBeenCalledTimes(1);
    });
  });
});