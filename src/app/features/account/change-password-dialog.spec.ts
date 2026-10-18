import { DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ToastService } from '@shared/ui';
import { apiError } from '../assets/asset-fixtures';
import { ChangePasswordDialog } from './change-password-dialog';

const URL = '/api/v1/users/me/password';

describe('ChangePasswordDialog', () => {
  let fixture: ComponentFixture<ChangePasswordDialog>;
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
        { provide: DialogRef, useValue: { close } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ChangePasswordDialog);
    fixture.detectChanges();
  }

  function fill(label: string, value: string): void {
    const control = field(label);
    control.value = value;
    control.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function fillAll(current = 'Vieja1234!', next = 'Nueva1234!', confirm = next): void {
    fill('Contraseña actual', current);
    fill('Nueva contraseña', next);
    fill('Confirma la nueva contraseña', confirm);
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

  it('tells the person that this session stays open and the others close', () => {
    setup();
    expect(text()).toContain(
      'Seguirás con la sesión abierta en este dispositivo. Se cerrarán las de tus otros dispositivos.',
    );
    expect(field('Contraseña actual').getAttribute('autocomplete')).toBe('current-password');
    expect(field('Nueva contraseña').getAttribute('autocomplete')).toBe('new-password');
  });

  it('does not scold the person before they try to send', () => {
    setup();
    expect(text()).not.toContain('Escribe tu contraseña actual.');
  });

  it('refuses an empty form and does not call the server', () => {
    setup();
    submit();
    expect(text()).toContain('Escribe tu contraseña actual.');
    expect(text()).toContain('La contraseña debe tener al menos 8 caracteres.');
    http.expectNone(URL);
  });

  it('refuses a weak new password', () => {
    setup();
    fillAll('Vieja1234!', 'solo letras');
    submit();
    expect(text()).toContain('Debe incluir al menos una letra y un número.');
    http.expectNone(URL);
  });

  it('refuses a new password equal to the current one, before asking the server', () => {
    setup();
    fillAll('Misma1234!', 'Misma1234!');
    submit();
    expect(text()).toContain('La nueva contraseña debe ser distinta de la actual.');
    http.expectNone(URL);
  });

  it('asks for the two new passwords to match', () => {
    setup();
    fillAll('Vieja1234!', 'Nueva1234!', 'Nueva1234?');
    submit();
    expect(text()).toContain('Las contraseñas no coinciden.');
    http.expectNone(URL);
  });

  it('sends both passwords, tells the person and closes, without touching the session', async () => {
    setup();
    fillAll();
    submit();

    const request = http.expectOne(URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      currentPassword: 'Vieja1234!',
      newPassword: 'Nueva1234!',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Cambiaste tu contraseña. Cerramos tu sesión en los demás dispositivos.',
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('puts a wrong current password next to its field, and stays open', async () => {
    setup();
    fillAll('Equivocada1');
    submit();
    http
      .expectOne(URL)
      .flush(apiError(400, 'INVALID_CURRENT_PASSWORD'), { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(text()).toContain('La contraseña actual no es correcta.');
    expect(field('Contraseña actual').getAttribute('aria-invalid')).toBe('true');
    expect(close).not.toHaveBeenCalled();

    fill('Contraseña actual', 'Otra12345'); // al corregirla, el aviso desaparece
    expect(text()).not.toContain('La contraseña actual no es correcta.');
  });

  it('shows the error of the server next to the new password', async () => {
    setup();
    fillAll();
    submit();
    http
      .expectOne(URL)
      .flush(
        apiError(400, 'VALIDATION_ERROR', [
          { field: 'newPassword', code: 'Pattern', message: 'must contain' },
        ]),
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(text()).toContain('Debe incluir al menos una letra y un número.');
    expect(text()).not.toContain('must contain');
  });

  it('shows a general error for any other failure, keeping what was typed', async () => {
    setup();
    fillAll();
    submit();
    http
      .expectOne(URL)
      .flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
    await settle();

    expect(el().querySelector('.callout--error')?.textContent).toContain(
      'Algo salió mal de nuestro lado',
    );
    expect(field('Nueva contraseña').value).toBe('Nueva1234!');
  });

  it('ignores a second submit while the first is in flight', () => {
    setup();
    fillAll();
    submit();
    submit();
    http.expectOne(URL); // expectOne falla si hubiera dos peticiones
  });
});
