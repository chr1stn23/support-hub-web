import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { UserAdmin } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@shared/ui';
import { apiError } from '../assets/asset-fixtures';
import { userAdmin } from './user-fixtures';
import { UserRolesDialog } from './user-roles-dialog';

const URL = '/api/v1/users/u-2/roles';

describe('UserRolesDialog', () => {
  let fixture: ComponentFixture<UserRolesDialog>;
  let http: HttpTestingController;
  let close: ReturnType<typeof vi.fn>;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const boxes = () => Array.from(el().querySelectorAll<HTMLInputElement>('input[type="checkbox"]')); // ADMIN, AGENT, ASSET_MANAGER, USER
  const save = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const settle = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  function setup(user: UserAdmin = userAdmin(), selfId = 'u-1') {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: { user } },
        { provide: DialogRef, useValue: { close } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).login('a@b.c', 'x').subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: selfId, email: 'a@b.c', fullName: 'Ana Admin', active: true, roles: ['ADMIN'] },
    });
    fixture = TestBed.createComponent(UserRolesDialog);
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

  it('shows the current roles checked, names the person and explains that the change is immediate', () => {
    setup();
    expect(boxes().map((b) => b.checked)).toEqual([false, true, false, false]);
    expect(text()).toContain('Elena Agente');
    expect(text()).toContain('El cambio se aplica de inmediato');
  });

  it('keeps "Guardar" disabled until the roles change', () => {
    setup();
    expect(save().hasAttribute('disabled')).toBe(true);
    boxes()[3].click();
    fixture.detectChanges();
    expect(save().hasAttribute('disabled')).toBe(false);

    boxes()[3].click(); // volver al estado original
    fixture.detectChanges();
    expect(save().hasAttribute('disabled')).toBe(true);
  });

  it('refuses to leave the person without any role', () => {
    setup();
    boxes()[1].click(); // quitar Agente
    fixture.detectChanges();
    submit();

    expect(text()).toContain('Selecciona al menos un rol.');
    http.expectNone(URL);
  });

  it('sends the roles ordered by influence, thanks the person and asks for a reload', async () => {
    setup();
    boxes()[3].click(); // + Usuario
    boxes()[0].click(); // + Administrador
    fixture.detectChanges();
    submit();

    const request = http.expectOne(URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ roles: ['ADMIN', 'AGENT', 'USER'] });
    request.flush(userAdmin());
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Actualizaste los roles de Elena Agente.',
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('on the own account, the administrator role cannot be taken away', () => {
    setup(userAdmin({ id: 'u-2', roles: ['ADMIN', 'AGENT'] }), 'u-2');
    expect(boxes()[0].disabled).toBe(true);
    expect(boxes()[0].checked).toBe(true);
    expect(text()).toContain('No puedes quitarte tu propio rol de administrador.');
    expect(boxes()[1].disabled).toBe(false); // lo demás sí se puede cambiar
  });

  it('on someone else, nothing is locked', () => {
    setup(userAdmin({ roles: ['ADMIN'] }));
    expect(boxes().every((b) => !b.disabled)).toBe(true);
  });

  it('stays open, with the explanation, when the server refuses', async () => {
    setup(userAdmin({ roles: ['ADMIN'] }));
    boxes()[0].click(); // quitar Administrador
    boxes()[3].click();
    fixture.detectChanges();
    submit();
    http
      .expectOne(URL)
      .flush(apiError(409, 'LAST_ADMIN_REQUIRED'), { status: 409, statusText: 'Conflict' });
    await settle();

    expect(el().querySelector('.callout--error')?.textContent).toContain(
      'Debe quedar al menos un administrador activo.',
    );
    expect(close).not.toHaveBeenCalled();
  });

  it('closes and asks for a reload when the account no longer exists', async () => {
    setup();
    boxes()[3].click();
    fixture.detectChanges();
    submit();
    http
      .expectOne(URL)
      .flush(apiError(404, 'RESOURCE_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
    await settle();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('ignores a second submit while the first is in flight', () => {
    setup();
    boxes()[3].click();
    fixture.detectChanges();
    submit();
    submit();
    http.expectOne(URL); // expectOne falla si hubiera dos peticiones
  });
});
