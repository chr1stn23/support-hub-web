import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ToastService } from '@shared/ui';
import { apiError } from '../assets/asset-fixtures';
import { ResetPasswordDialog } from './reset-password-dialog';
import { userAdmin } from './user-fixtures';

const URL = '/api/v1/users/u-2/password';

describe('ResetPasswordDialog', () => {
  let fixture: ComponentFixture<ResetPasswordDialog>;
  let http: HttpTestingController;
  let close: ReturnType<typeof vi.fn>;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const field = (label: string) => {
    const wrapper = Array.from(el().querySelectorAll('app-field')).find((f) =>
      f.querySelector('label')?.textContent?.includes(label),
    );
    return wrapper!.querySelector<HTMLInputElement>('input')!;
  };
  const settle = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  function setup() {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: { user: userAdmin() } },
        { provide: DialogRef, useValue: { close } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ResetPasswordDialog);
    fixture.detectChanges();
  }

  function fill(label: string, value: string): void {
    const control = field(label);
    control.value = value;
    control.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    el()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    TestBed.inject(ToastService).clear();
  });

  it('warns that every open session of that person will be closed', () => {
    setup();
    expect(text()).toContain('Se cerrarán todas las sesiones abiertas de Elena Agente.');
    expect(text()).toContain('Entre 8 y 72 caracteres, con al menos una letra y un número.');
  });

  it('refuses a weak password and does not call the server', () => {
    setup();
    fill('Nueva contraseña', 'corta');
    submit();
    expect(text()).toContain('La contraseña debe tener al menos 8 caracteres.');
    http.expectNone(URL);
  });

  it('asks for the two passwords to match', () => {
    setup();
    fill('Nueva contraseña', 'Demo1234!');
    fill('Confirma la contraseña', 'Demo1234?');
    submit();
    expect(text()).toContain('Las contraseñas no coinciden.');
    http.expectNone(URL);
  });

  it('sends the new password, thanks the person and asks for a reload', async () => {
    setup();
    fill('Nueva contraseña', 'Demo1234!');
    fill('Confirma la contraseña', 'Demo1234!');
    submit();

    const request = http.expectOne(URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ newPassword: 'Demo1234!' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Restableciste la contraseña de Elena Agente. Se cerraron sus sesiones abiertas.',
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('shows the error of the server next to the password field, in Spanish', async () => {
    setup();
    fill('Nueva contraseña', 'Demo1234!');
    fill('Confirma la contraseña', 'Demo1234!');
    submit();
    http
      .expectOne(URL)
      .flush(
        apiError(400, 'VALIDATION_ERROR', [
          { field: 'newPassword', code: 'Size', message: 'size' },
        ]),
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(text()).toContain('Debe tener entre 8 y 72 caracteres.');
    expect(close).not.toHaveBeenCalled();
  });

  it('closes and asks for a reload when the account no longer exists', async () => {
    setup();
    fill('Nueva contraseña', 'Demo1234!');
    fill('Confirma la contraseña', 'Demo1234!');
    submit();
    http
      .expectOne(URL)
      .flush(apiError(404, 'RESOURCE_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
    await settle();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('ignores a second submit while the first is in flight', () => {
    setup();
    fill('Nueva contraseña', 'Demo1234!');
    fill('Confirma la contraseña', 'Demo1234!');
    submit();
    submit();
    http.expectOne(URL); // expectOne falla si hubiera dos peticiones
  });
});
