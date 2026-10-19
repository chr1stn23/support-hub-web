import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import type { AppNotification, PageResponse, Role } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { UnreadNotifications } from '@core/notifications/unread-notifications.service';
import { ToastService } from '@shared/ui';
import { apiError } from '../assets/asset-fixtures';
import { NotificationsPage } from './notifications-page';

const LIST = (r: { url: string }) => r.url === '/api/v1/notifications';
const COUNT = '/api/v1/notifications/unread-count';

const note = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: 'n-1',
  type: 'TICKET_ASSIGNED',
  message: 'Carlos Agente tomó tu ticket TCK-000142',
  ticketId: 't-1',
  assetId: null,
  read: false,
  readAt: null,
  createdAt: new Date(Date.now() - 300_000).toISOString(),
  ...overrides,
});

const pageOf = (
  content: AppNotification[],
  totalElements = content.length,
): PageResponse<AppNotification> => ({
  content,
  page: 0,
  size: 20,
  totalElements,
  totalPages: Math.max(1, Math.ceil(totalElements / 20)),
});

describe('NotificationsPage', () => {
  let fixture: ComponentFixture<NotificationsPage>;
  let http: HttpTestingController;
  let router: Router;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const rows = () => Array.from(el().querySelectorAll('.item'));
  const list = () => http.expectOne(LIST);
  const button = (label: string) =>
    Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.trim() === label);
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup(roles: Role[] = ['AGENT'], params: Record<string, string> = {}, unread = 0) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true); // los enlaces de las filas

    TestBed.inject(AuthService).login('a@b.c', 'x').subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: 'u-1', email: 'a@b.c', fullName: 'Lucía Usuaria', active: true, roles },
    });
    TestBed.inject(UnreadNotifications).set(unread);

    fixture = TestBed.createComponent(NotificationsPage);
    for (const [name, value] of Object.entries(params)) {
      fixture.componentRef.setInput(name, value);
    }
    await settle();
  }

  async function loadWith(content: AppNotification[] = [note()], total = content.length) {
    list().flush(pageOf(content, total));
    await settle();
  }

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    TestBed.inject(ToastService).clear();
  });

  describe('the list', () => {
    it('asks for the first page of all of them, and shows each message as it came', async () => {
      await setup();
      const request = list();
      expect(request.request.params.get('page')).toBe('0');
      expect(request.request.params.get('size')).toBe('20');
      expect(request.request.params.get('unreadOnly')).toBe('false');
      request.flush(pageOf([note()]));
      await settle();

      expect(text()).toContain('Carlos Agente tomó tu ticket TCK-000142');
      expect(text()).toContain('hace 5 min');
    });

    it('shows the message as plain text, never as HTML', async () => {
      await setup();
      await loadWith([note({ message: '<img src=x onerror=alert(1)> te asignó algo' })]);
      expect(el().querySelector('.item img')).toBeNull();
      expect(el().querySelector('.item__message')?.textContent).toBe(
        '<img src=x onerror=alert(1)> te asignó algo',
      );
    });

    it('tells the unread ones apart, in words and not only in colour', async () => {
      await setup();
      await loadWith([
        note({ id: 'n-1' }),
        note({ id: 'n-2', read: true, message: 'Ya la viste' }),
      ]);

      expect(rows()[0].classList).toContain('is-unread');
      expect(rows()[0].textContent).toContain('No leída');
      expect(rows()[1].classList).not.toContain('is-unread');
      expect(rows()[1].textContent).not.toContain('No leída');
    });

    it('says there is nothing, in the words of each tab', async () => {
      await setup();
      await loadWith([]);
      expect(text()).toContain('Aún no tienes notificaciones');

      TestBed.resetTestingModule();
      await setup(['AGENT'], { vista: 'no-leidas' });
      await loadWith([]);
      expect(text()).toContain('No tienes notificaciones sin leer');
    });

    it('offers to go back to the first page when the page it is on no longer exists', async () => {
      await setup(['AGENT'], { pagina: '3' });
      await loadWith([]);

      expect(text()).toContain('No hay notificaciones en esta página');
      button('Volver a la primera página')!.click();
      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: {} }),
      );
    });

    it('shows the error in Spanish with a retry, and a skeleton while it loads', async () => {
      await setup();
      expect(el().querySelector('[aria-label="Cargando notificaciones"]')).not.toBeNull();
      list().flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
      await settle();
      expect(text()).toContain('No pudimos cargar las notificaciones');

      button('Reintentar')!.click();
      await settle();
      http.expectOne(COUNT).flush({ count: 0 });
      await loadWith();
      expect(text()).toContain('Carlos Agente tomó tu ticket');
    });
  });

  describe('the tabs and the pages', () => {
    it('has two tabs, and the unread one carries the number of the bell', async () => {
      await setup(['AGENT'], {}, 3);
      await loadWith();

      const tabs = Array.from(el().querySelectorAll('.link-tab')).map((a) =>
        (a.textContent ?? '').replace(/\s+/g, ' ').trim(),
      );
      expect(tabs).toEqual(['Todas', 'No leídas 3']);
      expect(el().querySelector('.link-tab.is-active')?.getAttribute('aria-current')).toBe('page');
    });

    it('asks only for the unread ones on its tab', async () => {
      await setup(['AGENT'], { vista: 'no-leidas' });
      const request = list();
      expect(request.request.params.get('unreadOnly')).toBe('true');
      request.flush(pageOf([]));
    });

    it('changes page (the URL counts from 1)', async () => {
      await setup();
      await loadWith([note()], 60);
      el().querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!.click();
      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { pagina: '2' } }),
      );
    });

    it('ignores nonsense in the URL instead of failing', async () => {
      await setup(['AGENT'], { vista: 'inventada', pagina: 'abc', tamano: '999' });
      const request = list();
      expect(request.request.params.get('unreadOnly')).toBe('false');
      expect(request.request.params.get('page')).toBe('0');
      expect(request.request.params.get('size')).toBe('20');
      request.flush(pageOf([]));
    });
  });

  describe('where each one leads', () => {
    it('to the ticket', async () => {
      await setup();
      await loadWith([note()]);
      expect(el().querySelector('.item__message')?.getAttribute('href')).toBe('/tickets/t-1');
    });

    it('to the equipment, for IT staff', async () => {
      await setup(['AGENT']);
      await loadWith([
        note({
          type: 'ASSET_ASSIGNED',
          ticketId: null,
          assetId: 'a-1',
          message: 'Se te asignó el equipo AST-000045',
        }),
      ]);
      expect(el().querySelector('.item__message')?.getAttribute('href')).toBe('/activos/a-1');
    });

    it('to "my equipment", for someone who cannot open the inventory', async () => {
      await setup(['USER']);
      await loadWith([
        note({
          type: 'ASSET_ASSIGNED',
          ticketId: null,
          assetId: 'a-1',
          message: 'Se te asignó el equipo AST-000045',
        }),
      ]);
      expect(el().querySelector('.item__message')?.getAttribute('href')).toBe('/mis-equipos');
    });

    it('nowhere, when it refers to nothing: the message is just text', async () => {
      await setup();
      await loadWith([note({ ticketId: null, assetId: null, message: 'Un aviso general' })]);
      expect(el().querySelector('a.item__message')).toBeNull();
      expect(el().querySelector('p.item__message')?.textContent).toBe('Un aviso general');
    });
  });

  describe('marking as read', () => {
    it('opening one marks it as read at once, and updates the bell with what the server says', async () => {
      await setup(['AGENT'], {}, 2);
      await loadWith([note(), note({ id: 'n-2', message: 'Otra' })]);

      el().querySelector<HTMLAnchorElement>('a.item__message')!.click();
      await settle();

      expect(rows()[0].classList).not.toContain('is-unread'); // optimista: sin esperar al servidor
      const request = http.expectOne('/api/v1/notifications/n-1/read');
      expect(request.request.method).toBe('POST');
      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      http.expectOne(COUNT).flush({ count: 1 });
      await settle();
      expect(TestBed.inject(UnreadNotifications).count()).toBe(1);
      expect(rows()[1].classList).toContain('is-unread');
    });

    it('does not mark again one that was already read', async () => {
      await setup();
      await loadWith([note({ read: true })]);
      el().querySelector<HTMLAnchorElement>('a.item__message')!.click();
      await settle();
      http.expectNone('/api/v1/notifications/n-1/read');
    });

    it('when opening one fails to register, it goes back to unread without bothering the person', async () => {
      await setup();
      await loadWith();

      el().querySelector<HTMLAnchorElement>('a.item__message')!.click();
      http
        .expectOne('/api/v1/notifications/n-1/read')
        .flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
      await settle();
      http.expectOne(COUNT).flush({ count: 1 });
      await settle();

      expect(rows()[0].classList).toContain('is-unread');
      expect(TestBed.inject(ToastService).toasts()).toHaveLength(0);
    });

    it('the button marks one as read, with a name that says which', async () => {
      await setup();
      await loadWith();

      const mark = el().querySelector<HTMLButtonElement>('.item button')!;
      expect(mark.getAttribute('aria-label')).toBe(
        'Marcar como leída: Carlos Agente tomó tu ticket TCK-000142',
      );
      mark.click();
      http
        .expectOne('/api/v1/notifications/n-1/read')
        .flush(null, { status: 204, statusText: 'No Content' });
      await settle();
      http.expectOne(COUNT).flush({ count: 0 });
      await settle();

      expect(rows()[0].classList).not.toContain('is-unread');
      expect(el().querySelector('.item button')).toBeNull(); // ya no hay nada que marcar
      expect(TestBed.inject(ToastService).toasts()).toHaveLength(0);
    });

    it('when the button fails, it says so (the person asked for it) and the notification stays unread', async () => {
      await setup();
      await loadWith();

      el().querySelector<HTMLButtonElement>('.item button')!.click();
      http
        .expectOne('/api/v1/notifications/n-1/read')
        .flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
      await settle();
      http.expectOne(COUNT).flush({ count: 1 });
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].kind).toBe('error');
      expect(rows()[0].classList).toContain('is-unread');
    });

    it('ignores a second click while the first is in flight', async () => {
      await setup();
      await loadWith();
      const mark = el().querySelector<HTMLButtonElement>('.item button')!;
      mark.click();
      mark.click();
      http.expectOne('/api/v1/notifications/n-1/read'); // expectOne falla si hubiera dos peticiones
    });
  });

  describe('marking all as read', () => {
    it('is disabled when there is nothing unread', async () => {
      await setup(['AGENT'], {}, 0);
      await loadWith();
      expect(button('Marcar todas como leídas')!.hasAttribute('disabled')).toBe(true);
    });

    it('marks them all, puts the bell at 0, says so and reloads the list', async () => {
      await setup(['AGENT'], {}, 3);
      await loadWith([note(), note({ id: 'n-2' }), note({ id: 'n-3' })]);

      button('Marcar todas como leídas')!.click();
      const request = http.expectOne('/api/v1/notifications/read-all');
      expect(request.request.method).toBe('POST');
      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(TestBed.inject(UnreadNotifications).count()).toBe(0);
      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Marcaste todas las notificaciones como leídas.',
      );
      await loadWith([
        note({ read: true }),
        note({ id: 'n-2', read: true }),
        note({ id: 'n-3', read: true }),
      ]);
      expect(el().querySelector('.item.is-unread')).toBeNull();
    });

    it('says why it failed, and leaves the bell as it was', async () => {
      await setup(['AGENT'], {}, 3);
      await loadWith();

      button('Marcar todas como leídas')!.click();
      http
        .expectOne('/api/v1/notifications/read-all')
        .flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].kind).toBe('error');
      expect(TestBed.inject(UnreadNotifications).count()).toBe(3);
    });

    it('ignores a second click while the first is in flight', async () => {
      await setup(['AGENT'], {}, 3);
      await loadWith();
      const markAll = button('Marcar todas como leídas')!;
      markAll.click();
      markAll.click();
      http.expectOne('/api/v1/notifications/read-all'); // expectOne falla si hubiera dos peticiones
    });
  });

  it('reloads the list and the bell when asked to', async () => {
    await setup();
    await loadWith();

    button('Actualizar')!.click();
    await settle();
    http.expectOne(COUNT).flush({ count: 4 });
    await loadWith([note({ message: 'Una nueva' })]);

    expect(text()).toContain('Una nueva');
    expect(TestBed.inject(UnreadNotifications).count()).toBe(4);
  });
});
