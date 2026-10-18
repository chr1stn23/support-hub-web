import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { UserAdmin } from '@core/api/models';
import { ToastService } from '@shared/ui';
import { apiError } from '../assets/asset-fixtures';
import { UserFormDialog } from './user-form-dialog';
import { userAdmin } from './user-fixtures';

const URL = '/api/v1/users';

describe('UserFormDialog', () => {
  let fixture: ComponentFixture<UserFormDialog>;
  let http: HttpTestingController;
  let close: ReturnType<typeof vi.fn>;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const save = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const field = (label: string) => {
    const wrapper = Array.from(el().querySelectorAll('app-field')).find((f) =>
      f.querySelector('label')?.textContent?.includes(label),
    );
    return wrapper?.querySelector<HTMLInputElement>('input') ?? null;
  };
  const roleBoxes = () =>
    Array.from(el().querySelectorAll<HTMLInputElement>('app-role-picker input[type="checkbox"]'));
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  function setup(user?: UserAdmin) {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: user ? { user } : {} },
        { provide: DialogRef, useValue: { close } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UserFormDialog);
    fixture.detectChanges();
  }

  function fill(label: string, value: string): void {
    const control = field(label)!;
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

  function fillValid(): void {
    fill('Nombre completo', '  Pedro Pérez ');
    fill('Correo', ' Pedro@Supporthub.local ');
    fill('Contraseña inicial', 'Demo1234!');
    roleBoxes()[3].click(); // Usuario
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    TestBed.inject(ToastService).clear();
  });

  describe('creating', () => {
    it('starts empty, asking for name, email, password and roles', () => {
      setup();
      expect(text()).toContain('Nuevo usuario');
      expect(field('Nombre completo')).not.toBeNull();
      expect(field('Contraseña inicial')).not.toBeNull();
      expect(roleBoxes()).toHaveLength(4);
      expect(text()).toContain('Entre 8 y 72 caracteres, con al menos una letra y un número.');
      expect(save().textContent?.trim()).toBe('Crear usuario');
      expect(save().hasAttribute('disabled')).toBe(false);
    });

    it('does not scold the person before they try to send', () => {
      setup();
      expect(text()).not.toContain('Escribe el nombre completo.');
    });

    it('refuses an empty form and does not call the server', () => {
      setup();
      submit();

      expect(text()).toContain('Escribe el nombre completo.');
      expect(text()).toContain('Escribe el correo.');
      expect(text()).toContain('La contraseña debe tener al menos 8 caracteres.');
      expect(text()).toContain('Selecciona al menos un rol.');
      expect(field('Nombre completo')!.getAttribute('aria-invalid')).toBe('true');
      http.expectNone(URL);
    });

    it('refuses a malformed email and a weak password', () => {
      setup();
      fillValid();
      fill('Correo', 'pedro');
      fill('Contraseña inicial', 'solo letras');
      submit();

      expect(text()).toContain('Ingresa un correo electrónico válido.');
      expect(text()).toContain('Debe incluir al menos una letra y un número.');
      http.expectNone(URL);
    });

    it('sends the trimmed data with the chosen roles, thanks the person and opens the new account', async () => {
      setup();
      fillValid();
      submit();

      const request = http.expectOne(URL);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        email: 'Pedro@Supporthub.local',
        fullName: 'Pedro Pérez',
        password: 'Demo1234!',
        roles: ['USER'],
      });
      request.flush(userAdmin({ id: 'u-99', fullName: 'Pedro Pérez' }), {
        status: 201,
        statusText: 'Created',
      });
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Creaste la cuenta de Pedro Pérez.',
      );
      expect(close).toHaveBeenCalledWith('u-99');
    });

    it('ignores a second submit while the first is in flight', () => {
      setup();
      fillValid();
      submit();
      submit();
      http.expectOne(URL); // expectOne falla si hubiera dos peticiones
    });

    it('puts the "email already used" error next to the email field, and stays open', async () => {
      setup();
      fillValid();
      submit();
      http
        .expectOne(URL)
        .flush(apiError(409, 'EMAIL_ALREADY_USED'), { status: 409, statusText: 'Conflict' });
      await settle();

      expect(text()).toContain('Ya existe un usuario con ese correo.');
      expect(field('Correo')!.getAttribute('aria-invalid')).toBe('true');
      expect(close).not.toHaveBeenCalled();

      fill('Correo', 'otro@supporthub.local'); // al corregirlo, el aviso desaparece
      expect(text()).not.toContain('Ya existe un usuario con ese correo.');
    });

    it('shows the errors of the server next to their field', async () => {
      setup();
      fillValid();
      submit();
      http
        .expectOne(URL)
        .flush(
          apiError(400, 'VALIDATION_ERROR', [
            { field: 'password', code: 'Pattern', message: 'must contain' },
          ]),
          { status: 400, statusText: 'Bad Request' },
        );
      await settle();

      expect(text()).toContain('Debe incluir al menos una letra y un número.');
      expect(text()).not.toContain('must contain');
    });

    it('keeps what was typed when something else fails', async () => {
      setup();
      fillValid();
      submit();
      http
        .expectOne(URL)
        .flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
      await settle();

      expect(el().querySelector('.callout--error')?.textContent).toContain(
        'Algo salió mal de nuestro lado',
      );
      expect(field('Nombre completo')!.value).toBe('  Pedro Pérez ');
    });
  });

  describe('editing', () => {
    it('starts with the current values, has no password nor roles, and "Guardar" disabled until something changes', () => {
      setup(userAdmin());
      expect(text()).toContain('Editar usuario');
      expect(field('Nombre completo')!.value).toBe('Elena Agente');
      expect(field('Contraseña inicial')).toBeNull();
      expect(roleBoxes()).toHaveLength(0);
      expect(save().hasAttribute('disabled')).toBe(true);

      fill('Nombre completo', 'Elena Pérez');
      expect(save().hasAttribute('disabled')).toBe(false);
    });

    it('does not count a change in the case of the email as a change', () => {
      setup(userAdmin());
      fill('Correo', 'ELENA@supporthub.local');
      expect(save().hasAttribute('disabled')).toBe(true);
    });

    it('sends only what changed, with the version that was read', async () => {
      setup(userAdmin());
      fill('Nombre completo', '  Elena Pérez ');
      submit();

      const request = http.expectOne(`${URL}/u-2`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ version: 3, fullName: 'Elena Pérez' });
      request.flush(userAdmin());
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Guardaste los cambios del usuario.',
      );
      expect(close).toHaveBeenCalledWith(true);
    });

    it('validates before sending', () => {
      setup(userAdmin());
      fill('Nombre completo', '   ');
      submit();
      expect(text()).toContain('Escribe el nombre completo.');
      http.expectNone(`${URL}/u-2`);
    });

    it('puts the "email already used" error next to the email field', async () => {
      setup(userAdmin());
      fill('Correo', 'otra@supporthub.local');
      submit();
      http
        .expectOne(`${URL}/u-2`)
        .flush(apiError(409, 'EMAIL_ALREADY_USED'), { status: 409, statusText: 'Conflict' });
      await settle();

      expect(text()).toContain('Ya existe un usuario con ese correo.');
      expect(close).not.toHaveBeenCalled();
    });

    describe('when someone else edited the person meanwhile', () => {
      async function conflict() {
        setup(userAdmin());
        fill('Nombre completo', 'Mi nombre');
        submit();
        http
          .expectOne(`${URL}/u-2`)
          .flush(apiError(409, 'CONCURRENT_MODIFICATION'), { status: 409, statusText: 'Conflict' });
        await settle();
        http
          .expectOne(`${URL}/u-2`)
          .flush(userAdmin({ version: 4, email: 'nuevo@supporthub.local' })); // la versión actual
        await settle();
      }

      it('explains it, keeps what the person changed and brings in the rest', async () => {
        await conflict();
        expect(text()).toContain('Alguien más modificó a esta persona mientras la editabas');
        expect(field('Nombre completo')!.value).toBe('Mi nombre');
        expect(field('Correo')!.value).toBe('nuevo@supporthub.local');
        expect(close).not.toHaveBeenCalled();
      });

      it("saves again with the new version, sending only the person's own change", async () => {
        await conflict();
        submit();

        const request = http.expectOne(`${URL}/u-2`);
        expect(request.request.body).toEqual({ version: 4, fullName: 'Mi nombre' });
        request.flush(userAdmin({ version: 5 }));
        await settle();
        expect(close).toHaveBeenCalledWith(true);
      });
    });

    it('closes and asks for a reload when the account no longer exists', async () => {
      setup(userAdmin());
      fill('Nombre completo', 'Tarde');
      submit();
      http
        .expectOne(`${URL}/u-2`)
        .flush(apiError(404, 'RESOURCE_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
      await settle();
      expect(close).toHaveBeenCalledWith(true);
    });
  });
});
