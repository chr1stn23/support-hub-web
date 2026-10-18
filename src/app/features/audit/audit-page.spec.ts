import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import type { AuditLogEntry } from '@core/api/models';
import { apiError } from '../assets/asset-fixtures';
import { AuditPage } from './audit-page';

const URL = '/api/v1/audit-logs';
const ACTOR = '0c9d6e0e-7b1d-4c0a-9f0e-3a6f5f0c1b11';

const entry = (overrides: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
  id: 'e-1',
  actor: { id: ACTOR, fullName: 'Carlos Agente' },
  action: 'TICKET_STATUS_CHANGED',
  entityType: 'TICKET',
  entityId: 't-1',
  result: 'SUCCESS',
  metadata: { ticketCode: 'TCK-000142', from: 'IN_PROGRESS', to: 'RESOLVED' },
  createdAt: '2026-10-08T19:32:00Z',
  ...overrides,
});

const pageOf = (content: AuditLogEntry[], totalElements = content.length) => ({
  content,
  page: 0,
  size: 20,
  totalElements,
  totalPages: Math.max(1, Math.ceil(totalElements / 20)),
});

describe('AuditPage', () => {
  let fixture: ComponentFixture<AuditPage>;
  let http: HttpTestingController;
  let router: Router;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const logs = () => http.expectOne((r) => r.url === URL);
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup(params: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'auditoria', component: AuditPage }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    await router.navigateByUrl('/auditoria');

    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(AuditPage);
    for (const [name, value] of Object.entries(params)) {
      fixture.componentRef.setInput(name, value);
    }
    await settle();
  }

  async function loadWith(content: AuditLogEntry[] = [entry()], total = content.length) {
    logs().flush(pageOf(content, total));
    await settle();
  }

  afterEach(() => http.verify({ ignoreCancelled: true }));

  it('asks for the first page with no filters, and shows each record', async () => {
    await setup();
    const request = logs();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.has('action')).toBe(false);
    request.flush(pageOf([entry()]));
    await settle();

    expect(text()).toContain('Carlos Agente');
    expect(text()).toContain('Cambió el estado del ticket TCK-000142 de «En curso» a «Resuelto»');
    expect(text()).toContain('Correcto');
    expect(text()).toMatch(/2026/); // la fecha exacta, no "hace…"
  });

  it('links the object of each record', async () => {
    await setup();
    await loadWith();
    expect(el().querySelector('td a[href="/tickets/t-1"]')?.textContent?.trim()).toBe('TCK-000142');
  });

  it('shows a failed login from someone unknown as an alert', async () => {
    await setup();
    await loadWith([
      entry({
        action: 'LOGIN_FAILED',
        actor: null,
        entityType: 'USER',
        entityId: null,
        result: 'FAILURE',
        metadata: { email: 'x@y.com', ip: '1.2.3.4', reason: 'UNKNOWN_USER' },
      }),
    ]);

    expect(text()).toContain('Desconocido');
    expect(text()).toContain(
      'Intento de inicio de sesión fallido (correo desconocido) con x@y.com',
    );
    expect(text()).toContain('Fallido');
    expect(el().querySelector('tr.is-alert')).not.toBeNull();
  });

  it('folds the technical data in a native "Detalles", as plain text', async () => {
    await setup();
    await loadWith([
      entry({
        action: 'LOGIN_SUCCESS',
        entityType: 'USER',
        entityId: ACTOR,
        metadata: { ip: '<b>1.2.3.4</b>' },
      }),
    ]);

    const details = el().querySelector('details.meta')!;
    expect(details.querySelector('summary')?.textContent).toBe('Detalles');
    expect(details.textContent).toContain('Dirección IP');
    expect(details.textContent).toContain('<b>1.2.3.4</b>');
    expect(details.querySelector('b')).toBeNull();
  });

  it('does not show "Detalles" when the sentence says it all', async () => {
    await setup();
    await loadWith();
    expect(el().querySelector('details.meta')).toBeNull();
  });

  it('turns the filters of the URL into the query for the backend', async () => {
    await setup({
      accion: 'LOGIN_FAILED',
      area: 'seguridad',
      resultado: 'fallo',
      persona: ACTOR,
      desde: '2026-10-01',
      hasta: '2026-10-08',
      pagina: '3',
      tamano: '50',
    });
    const request = logs();
    const params = request.request.params;

    expect(params.get('action')).toBe('LOGIN_FAILED');
    expect(params.get('entityType')).toBe('SECURITY');
    expect(params.get('result')).toBe('FAILURE');
    expect(params.get('actorId')).toBe(ACTOR);
    expect(params.get('page')).toBe('2');
    expect(params.get('size')).toBe('50');
    expect(new Date(params.get('from')!).getHours()).toBe(0);
    expect(new Date(params.get('to')!).getHours()).toBe(23);
    request.flush(pageOf([]));
  });

  it('ignores nonsense in the URL instead of failing', async () => {
    await setup({
      accion: 'HACKER',
      area: 'x',
      resultado: 'x',
      persona: 'x',
      desde: '2026-13-45',
      pagina: 'abc',
      tamano: '999',
    });
    const request = logs();
    for (const name of ['action', 'entityType', 'result', 'actorId', 'from', 'to']) {
      expect(request.request.params.has(name)).toBe(false);
    }
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    request.flush(pageOf([]));
  });

  it('offers the actions grouped by area', async () => {
    await setup();
    await loadWith();
    const select = el().querySelector<HTMLSelectElement>(
      'select[aria-label="Filtrar por acción"]',
    )!;
    expect(Array.from(select.querySelectorAll('optgroup')).map((g) => g.label)).toEqual([
      'Sesión y seguridad',
      'Usuarios',
      'Tickets',
      'Equipos',
    ]);
    expect(select.querySelectorAll('option')).toHaveLength(26); // las 25 y "Todas"
    expect(select.textContent).toContain('Inicio de sesión fallido');
  });

  it('changes the filters through the URL, going back to the first page', async () => {
    await setup({ pagina: '2' });
    await loadWith([entry()], 60);

    const action = el().querySelector<HTMLSelectElement>(
      'select[aria-label="Filtrar por acción"]',
    )!;
    action.value = 'LOGIN_FAILED';
    action.dispatchEvent(new Event('change'));
    expect(router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { accion: 'LOGIN_FAILED' } }),
    );

    const area = el().querySelector<HTMLSelectElement>('select[aria-label="Filtrar por área"]')!;
    area.value = 'equipo';
    area.dispatchEvent(new Event('change'));
    expect(router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { area: 'equipo' } }),
    );
  });

  it('changes the result and the dates through the URL', async () => {
    await setup();
    await loadWith();

    const result = el().querySelector<HTMLSelectElement>(
      'select[aria-label="Filtrar por resultado"]',
    )!;
    result.value = 'fallo';
    result.dispatchEvent(new Event('change'));
    expect(router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { resultado: 'fallo' } }),
    );

    const [from] = Array.from(el().querySelectorAll<HTMLInputElement>('input[type="date"]'));
    from.value = '2026-10-01';
    from.dispatchEvent(new Event('change'));
    expect(router.navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { desde: '2026-10-01' } }),
    );
  });

  it('warns when the date range is backwards', async () => {
    await setup({ desde: '2026-10-08', hasta: '2026-10-01' });
    await loadWith([]);
    expect(text()).toContain('posterior');
  });

  describe('filtering by person', () => {
    it("clicking the name shows only that person's activity, keeping the other filters", async () => {
      await setup({ area: 'ticket' });
      await loadWith();

      const link = el().querySelector<HTMLAnchorElement>('a.actor')!;
      expect(link.getAttribute('href')).toBe(`/auditoria?area=ticket&persona=${ACTOR}`);
      expect(link.getAttribute('title')).toBe('Ver solo la actividad de Carlos Agente');
    });

    it('shows who is being filtered, and removes the filter with one click', async () => {
      await setup({ persona: ACTOR });
      await loadWith();

      const chip = Array.from(el().querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Quitar el filtro de persona',
      )!;
      expect(chip.textContent).toContain('Persona: Carlos Agente');
      chip.click();
      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: {} }),
      );
    });

    it('does not make up a name when there are no records to take it from', async () => {
      await setup({ persona: ACTOR });
      await loadWith([]);
      expect(text()).toContain('Persona: una persona');
    });
  });

  it('changes page (the URL counts from 1)', async () => {
    await setup();
    await loadWith([entry()], 60);
    el().querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { pagina: '2' } }),
    );
  });

  it('clears every filter at once', async () => {
    await setup({ accion: 'LOGOUT', resultado: 'exito', desde: '2026-10-01' });
    await loadWith([]);
    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Limpiar filtros'))!
      .click();
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {} }));
  });

  it('tells apart "nothing yet" from "nothing matches the filters"', async () => {
    await setup();
    await loadWith([]);
    expect(text()).toContain('Aún no hay registros');

    TestBed.resetTestingModule();
    await setup({ accion: 'LOGOUT' });
    await loadWith([]);
    expect(text()).toContain('Ningún registro coincide con los filtros');
  });

  it('shows the error with a retry', async () => {
    await setup();
    logs().flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
    await settle();
    expect(text()).toContain('No pudimos cargar la auditoría');

    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Reintentar')!
      .click();
    await settle();
    await loadWith();
    expect(text()).toContain('Carlos Agente');
  });

  it('shows a skeleton while the first page loads', async () => {
    await setup();
    expect(el().querySelector('[aria-label="Cargando la auditoría"]')).not.toBeNull();
    logs().flush(pageOf([]));
  });
});
