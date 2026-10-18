import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import type { AssetListItem, TicketSummary, UserAdmin } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { DialogService, ToastService } from '@shared/ui';
import { apiError } from '../assets/asset-fixtures';
import { ResetPasswordDialog } from './reset-password-dialog';
import { UserDetailPage } from './user-detail-page';
import { UserFormDialog } from './user-form-dialog';
import { userAdmin } from './user-fixtures';
import { UserRolesDialog } from './user-roles-dialog';

const U = '/api/v1/users/u-2';

const asset = (): AssetListItem => ({
  id: 'a-1',
  assetTag: 'AST-000045',
  type: 'Laptop',
  brand: 'Dell',
  model: 'Latitude 5440',
  status: 'ASSIGNED',
  location: null,
  assignedTo: { id: 'u-2', fullName: 'Elena Agente' },
});
const ticket = (): TicketSummary => ({
  id: 't-1',
  ticketCode: 'TCK-000142',
  title: 'Laptop no enciende',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  categoryName: 'Hardware',
  requester: { id: 'u-9', fullName: 'Lucía' },
  agent: { id: 'u-2', fullName: 'Elena Agente' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  canAssignToSelf: false,
});
const pageOf = <T>(content: T[]) => ({
  content,
  page: 0,
  size: 50,
  totalElements: content.length,
  totalPages: 1,
});

describe('UserDetailPage', () => {
  let fixture: ComponentFixture<UserDetailPage>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const button = (label: string) =>
    Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.trim() === label);
  const equipmentRequest = () =>
    http.expectOne((r) => r.url === '/api/v1/assets' && r.params.get('assignedTo') === 'u-2');
  const ticketsRequest = () =>
    http.expectOne((r) => r.url === '/api/v1/tickets' && r.params.get('assignedTo') === 'u-2');
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  function create(selfId = 'u-1') {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).login('a@b.c', 'x').subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: selfId, email: 'a@b.c', fullName: 'Ana Admin', active: true, roles: ['ADMIN'] },
    });
    fixture = TestBed.createComponent(UserDetailPage);
    fixture.componentRef.setInput('id', 'u-2');
  }

  async function setup(
    user: UserAdmin = userAdmin(),
    equipment: AssetListItem[] = [],
    tickets: TicketSummary[] = [],
    selfId = 'u-1',
  ) {
    create(selfId);
    await settle();
    http.expectOne(U).flush(user);
    equipmentRequest().flush(pageOf(equipment));
    ticketsRequest().flush(pageOf(tickets));
    await settle();
  }

  async function expectReload(user: UserAdmin = userAdmin()) {
    http.expectOne(U).flush(user);
    equipmentRequest().flush(pageOf([]));
    ticketsRequest().flush(pageOf([]));
    await settle();
  }

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    TestBed.inject(ToastService).clear();
  });

  describe('the data', () => {
    it('shows the header and the side details', async () => {
      await setup();
      expect(el().querySelector('h1')?.textContent).toBe('Elena Agente');
      expect(text()).toContain('elena@supporthub.local');
      expect(text()).toContain('Activo');
      expect(text()).toContain('Agente');
      expect(text()).toContain('hace 10 min');
    });

    it('says when someone never signed in', async () => {
      await setup(userAdmin({ lastLoginAt: null }));
      expect(el().querySelector('.detail-side')?.textContent).toContain('Nunca');
    });

    it('lists the equipment and the open tickets the person has, with links', async () => {
      await setup(userAdmin(), [asset()], [ticket()]);
      expect(text()).toContain('Equipos asignados 1');
      expect(text()).toContain('Dell Latitude 5440');
      expect(el().querySelector('a[href="/activos/a-1"]')).not.toBeNull();
      expect(text()).toContain('Tickets en curso a su cargo 1');
      expect(el().querySelector('a[href="/tickets/t-1"]')).not.toBeNull();
    });

    it('asks only for the equipment of this person and for the tickets that block a deactivation', async () => {
      create();
      await settle();
      http.expectOne(U).flush(userAdmin());
      const tickets = ticketsRequest();
      expect(tickets.request.params.get('status')).toBe('IN_PROGRESS,WAITING');
      tickets.flush(pageOf([]));
      equipmentRequest().flush(pageOf([]));
    });

    it('says when there is nothing assigned', async () => {
      await setup();
      expect(text()).toContain('No tiene equipos asignados.');
      expect(text()).toContain('No tiene tickets en curso.');
    });

    it('puts the name in the title of the browser tab', async () => {
      await setup();
      expect(TestBed.inject(Title).getTitle()).toBe('Elena Agente · SupportHub');
    });
  });

  describe('what blocks a deactivation', () => {
    it('warns before trying, naming what the person still has', async () => {
      await setup(userAdmin(), [asset()], [ticket()]);
      expect(text()).toContain('Esta persona tiene a su cargo 1 equipo y 1 ticket en curso.');
    });

    it('does not warn without pending work, nor on an account that is already inactive', async () => {
      await setup();
      expect(el().querySelector('.callout--warning')).toBeNull();

      TestBed.resetTestingModule();
      await setup(userAdmin({ active: false }), [asset()], []);
      expect(el().querySelector('.callout--warning')).toBeNull();
    });
  });

  describe('the actions', () => {
    it('another person: edit, roles, reset password and deactivate', async () => {
      await setup();
      expect(button('Editar')).toBeTruthy();
      expect(button('Cambiar roles')).toBeTruthy();
      expect(button('Restablecer contraseña')).toBeTruthy();
      expect(button('Desactivar')).toBeTruthy();
      expect(button('Reactivar')).toBeUndefined();
    });

    it('an inactive account offers to reactivate it instead', async () => {
      await setup(userAdmin({ active: false }));
      expect(button('Reactivar')).toBeTruthy();
      expect(button('Desactivar')).toBeUndefined();
    });

    it('the own account: no reset, no deactivation, and an explanation', async () => {
      await setup(userAdmin({ id: 'u-2' }), [], [], 'u-2');
      expect(button('Editar')).toBeTruthy();
      expect(button('Cambiar roles')).toBeTruthy();
      expect(button('Restablecer contraseña')).toBeUndefined();
      expect(button('Desactivar')).toBeUndefined();
      expect(text()).toContain('Esta es tu cuenta');
    });

    it.each([
      ['Editar', UserFormDialog],
      ['Cambiar roles', UserRolesDialog],
      ['Restablecer contraseña', ResetPasswordDialog],
    ] as const)(
      '"%s" opens its dialog with the person, and reloads when the dialog says so',
      async (label, component) => {
        await setup();
        const open = vi
          .spyOn(TestBed.inject(DialogService), 'open')
          .mockReturnValue({ closed: of(true) } as never);

        button(label)!.click();
        await settle();

        expect(open).toHaveBeenCalledWith(
          component,
          expect.objectContaining({ data: { user: expect.objectContaining({ id: 'u-2' }) } }),
        );
        await expectReload();
      },
    );

    it('does not reload when the dialog is cancelled', async () => {
      await setup();
      vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({
        closed: of(false),
      } as never);
      button('Cambiar roles')!.click();
      await settle();
      http.expectNone(U);
    });
  });

  describe('deactivating and reactivating', () => {
    it('asks first, with a destructive confirmation that names the person, and does nothing when cancelled', async () => {
      await setup();
      const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(false);

      button('Desactivar')!.click();
      await settle();

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Desactivar cuenta',
          destructive: true,
          message: expect.stringContaining('Elena Agente'),
        }),
      );
      http.expectNone(`${U}/deactivate`);
    });

    it('deactivates, says so and reloads', async () => {
      await setup();
      vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(true);

      button('Desactivar')!.click();
      await settle();
      const request = http.expectOne(`${U}/deactivate`);
      expect(request.request.method).toBe('POST');
      request.flush(userAdmin({ active: false }));
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Desactivaste la cuenta de Elena Agente.',
      );
      await expectReload(userAdmin({ active: false }));
      expect(button('Reactivar')).toBeTruthy();
    });

    it('explains it, and still refreshes, when the server refuses because the person has pending work', async () => {
      await setup(userAdmin(), [asset()], []);
      vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(true);

      button('Desactivar')!.click();
      await settle();
      http
        .expectOne(`${U}/deactivate`)
        .flush(apiError(409, 'USER_HAS_ACTIVE_ASSIGNMENTS'), {
          status: 409,
          statusText: 'Conflict',
        });
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].kind).toBe('error');
      await expectReload();
    });

    it('reactivates without asking, and says so', async () => {
      await setup(userAdmin({ active: false }));

      button('Reactivar')!.click();
      await settle();
      http.expectOne(`${U}/activate`).flush(userAdmin());
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Reactivaste la cuenta de Elena Agente.',
      );
      await expectReload();
    });
  });

  describe('when things go wrong', () => {
    it('says the person was not found on a 404', async () => {
      create();
      await settle();
      http
        .expectOne(U)
        .flush(apiError(404, 'RESOURCE_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
      equipmentRequest().flush(pageOf([]));
      ticketsRequest().flush(pageOf([]));
      await settle();

      expect(text()).toContain('No encontramos a esta persona');
      expect(el().querySelector('h1')).toBeNull();
    });

    it('shows an error with a retry for other failures', async () => {
      create();
      await settle();
      http
        .expectOne(U)
        .flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
      equipmentRequest().flush(pageOf([]));
      ticketsRequest().flush(pageOf([]));
      await settle();
      expect(text()).toContain('No pudimos cargar el usuario');

      Array.from(el().querySelectorAll('button'))
        .find((b) => b.textContent?.trim() === 'Reintentar')!
        .click();
      await settle();
      await expectReload();
      expect(el().querySelector('h1')?.textContent).toBe('Elena Agente');
    });

    it('never shows the data of the previous person under the new address', async () => {
      await setup();
      fixture.componentRef.setInput('id', 'u-3');
      await settle();

      expect(el().querySelector('h1')).toBeNull();
      expect(el().querySelector('[aria-label="Cargando el usuario"]')).not.toBeNull();
      http.expectOne('/api/v1/users/u-3').flush(userAdmin({ id: 'u-3', fullName: 'Otra Persona' }));
      http
        .expectOne((r) => r.url === '/api/v1/assets' && r.params.get('assignedTo') === 'u-3')
        .flush(pageOf([]));
      http
        .expectOne((r) => r.url === '/api/v1/tickets' && r.params.get('assignedTo') === 'u-3')
        .flush(pageOf([]));
      await settle();
      expect(el().querySelector('h1')?.textContent).toBe('Otra Persona');
    });
  });
});
