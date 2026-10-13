import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '@core/auth/auth.service';
import { LoginPage, formatCountdown } from './login-page';

const LOGIN = '/api/v1/auth/login';
const user = {
  id: 'u-1',
  email: 'user@supporthub.local',
  fullName: 'Lucía Usuaria',
  active: true,
  roles: ['USER' as const],
};
const okResponse = { tokenType: 'Bearer', expiresIn: 900, user };
const errorBody = (status: number, code: string) => ({
  timestamp: '',
  status,
  code,
  message: 'x',
  path: '',
  fieldErrors: [],
});

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let http: HttpTestingController;
  let router: Router;

  const el = () => fixture.nativeElement as HTMLElement;
  const input = (type: 'email' | 'password') =>
    el().querySelector<HTMLInputElement>(`input[type="${type}"]`)!;
  const submitButton = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');

  function type(field: 'email' | 'password', value: string): void {
    const control = input(field);
    control.value = value;
    control.dispatchEvent(new Event('input'));
  }

  function submit(): void {
    el()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  /** Deja correr las promesas pendientes. */
  const settle = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  function setup(returnUrl?: string) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(LoginPage);
    if (returnUrl !== undefined) {
      fixture.componentRef.setInput('returnUrl', returnUrl);
    }
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks for both fields before calling the server', () => {
    setup();
    submit();

    expect(text()).toContain('Ingresa tu correo.');
    expect(text()).toContain('Ingresa tu contraseña.');
    expect(input('email').getAttribute('aria-invalid')).toBe('true');
    http.expectNone(LOGIN);
  });

  it('rejects a malformed email', () => {
    setup();
    type('email', 'lucia');
    type('password', 'algo');
    submit();

    expect(text()).toContain('Ingresa un correo electrónico válido.');
    http.expectNone(LOGIN);
  });

  it('signs in and goes to the page the person was trying to reach', async () => {
    setup('/tickets?status=OPEN');
    type('email', ' user@supporthub.local ');
    type('password', 'Demo1234!');
    submit();

    const request = http.expectOne(LOGIN);
    expect(request.request.body).toEqual({ email: 'user@supporthub.local', password: 'Demo1234!' });
    request.flush(okResponse);
    await settle();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/tickets?status=OPEN');
  });

  it('goes to the summary by default', async () => {
    setup();
    type('email', 'user@supporthub.local');
    type('password', 'Demo1234!');
    submit();
    http.expectOne(LOGIN).flush(okResponse);
    await settle();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/resumen');
  });

  it('ignores a returnUrl that points to another site', async () => {
    setup('//evil.example.com');
    type('email', 'user@supporthub.local');
    type('password', 'Demo1234!');
    submit();
    http.expectOne(LOGIN).flush(okResponse);
    await settle();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/resumen');
  });

  it('shows the message of a wrong password, clears it and keeps the email', async () => {
    setup();
    type('email', 'user@supporthub.local');
    type('password', 'mala');
    submit();
    http
      .expectOne(LOGIN)
      .flush(errorBody(401, 'INVALID_CREDENTIALS'), { status: 401, statusText: 'Unauthorized' });
    await settle();

    expect(text()).toContain('Correo o contraseña incorrectos.');
    expect(el().querySelector('[role="alert"]')).not.toBeNull();
    expect(input('password').value).toBe('');
    expect(input('email').value).toBe('user@supporthub.local');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('ignores a second submit while the first is in flight', () => {
    setup();
    type('email', 'user@supporthub.local');
    type('password', 'Demo1234!');
    submit();
    submit();

    http.expectOne(LOGIN); // expectOne falla si hubiera dos peticiones
    expect(submitButton().getAttribute('aria-busy')).toBe('true');
  });

  it('after too many attempts, counts down and blocks the button until it ends', async () => {
    vi.useFakeTimers();
    setup();
    type('email', 'user@supporthub.local');
    type('password', 'mala');
    submit();

    http.expectOne(LOGIN).flush(errorBody(429, 'TOO_MANY_ATTEMPTS'), {
      status: 429,
      statusText: 'Too Many Requests',
      headers: { 'Retry-After': '3' },
    });
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(text()).toContain('Demasiados intentos fallidos');
    expect(text()).toContain('0:03');
    expect(submitButton().hasAttribute('disabled')).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(text()).toContain('0:02');

    await vi.advanceTimersByTimeAsync(2000);
    fixture.detectChanges();
    expect(submitButton().hasAttribute('disabled')).toBe(false);
    expect(text()).not.toContain('Demasiados intentos fallidos');
  });

  it('explains why the previous session was lost', async () => {
    setup();
    const auth = TestBed.inject(AuthService);
    const restoring = auth.restore();
    http.expectOne('/api/v1/auth/me').error(new ProgressEvent('error'));
    await restoring;
    fixture.detectChanges();

    expect(text()).toContain('No pudimos verificar tu sesión porque el servidor no responde.');
  });

  it('offers demo accounts in development and fills the form with them', () => {
    setup();
    const demo = el().querySelector<HTMLButtonElement>('.demo button')!;
    demo.click();
    fixture.detectChanges();

    expect(input('email').value).toBe(demo.textContent?.trim());
    expect(input('password').value).toBe('Demo1234!');
  });
});

describe('formatCountdown', () => {
  it.each([
    [0, '0:00'],
    [3, '0:03'],
    [60, '1:00'],
    [214, '3:34'],
    [900, '15:00'],
  ])('%i s → %s', (seconds, expected) => {
    expect(formatCountdown(seconds)).toBe(expected);
  });
});
