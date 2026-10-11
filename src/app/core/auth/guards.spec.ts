import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import type { Role } from '../api/models';
import { AuthService } from './auth.service';
import { authGuard, guestGuard, roleGuard } from './guards';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('guards', () => {
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    router = TestBed.inject(Router);
  });

  function loginAs(...roles: Role[]): void {
    const auth = TestBed.inject(AuthService);
    auth.login('a@b.c', 'x').subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/auth/login')
      .flush({
        accessToken: 'tok',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: { id: 'u-1', email: 'a@b.c', fullName: 'A', active: true, roles },
      });
  }

  function run(guard: CanActivateFn, url = '/dev/admin') {
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  it('authGuard sends visitors to the login and remembers where they were going', () => {
    const result = run(authGuard, '/dev/admin') as UrlTree;
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fdev%2Fadmin');
  });

  it('authGuard lets signed-in users through', () => {
    loginAs('USER');
    expect(run(authGuard)).toBe(true);
  });

  it('guestGuard keeps signed-in users away from the login', () => {
    expect(run(guestGuard)).toBe(true);
    loginAs('USER');
    expect(router.serializeUrl(run(guestGuard) as UrlTree)).toBe('/');
  });

  it('roleGuard allows any of the listed roles', () => {
    loginAs('AGENT');
    expect(run(roleGuard('AGENT', 'ADMIN'))).toBe(true);
  });

  it('roleGuard redirects everyone else to /forbidden', () => {
    loginAs('USER', 'ASSET_MANAGER');
    expect(router.serializeUrl(run(roleGuard('ADMIN')) as UrlTree)).toBe('/forbidden');
  });
});
