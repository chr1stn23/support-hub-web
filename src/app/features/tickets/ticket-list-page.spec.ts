import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DashboardSummary, PageResponse, Role, TicketSummary } from '@core/api/models';
import { TicketListPage } from '@features/tickets/ticket-list-page';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@shared/ui';

const ME = 'u-1';
const CATEGORY = '0c9d6e0e-7b1d-4c0a-9f0e-3a6f5f0c1b11';

const ticket = (overrides: Partial<TicketSummary> = {}): TicketSummary => ({
  id: 't-1',
  ticketCode: 'TCK-000142',
  title: 'Laptop no enciende',
  status: 'OPEN',
  priority: 'HIGH',
  categoryName: 'Hardware',
  requester: { id: 'u-9', fullName: 'Lucía Usuaria' },
  agent: null,
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  updatedAt: new Date().toISOString(),
  canAssignToSelf: false,
  ...overrides,
});

const pageOf = (
  content: TicketSummary[],
  totalElements = content.length,
): PageResponse<TicketSummary> => ({
  content,
  page: 0,
  size: 20,
  totalElements,
  totalPages: Math.max(1, Math.ceil(totalElements / 20)),
});

const summary: DashboardSummary = {
  scope: 'ALL',
  tickets: {
    open: 12,
    unassigned: 3,
    highPriorityOpen: 4,
    byStatus: { OPEN: 3, IN_PROGRESS: 6, WAITING: 3, RESOLVED: 5, CLOSED: 10, CANCELLED: 2 },
  },
  mine: { assignedOpen: 5, resolvedInPeriod: 1 },
};

describe('TicketListPage', () => {
  let fixture: ComponentFixture<TicketListPage>;
  let http: HttpTestingController;
  let router: Router;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const tickets = () => http.expectOne((r) => r.url === '/api/v1/tickets');

  /** Deja correr los efectos y las promesas pendientes. */
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup(roles: Role[] = ['AGENT'], params: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    TestBed.inject(AuthService).login('a@b.c', 'x').subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: ME, email: 'a@b.c', fullName: 'Carlos Agente', active: true, roles },
    });

    fixture = TestBed.createComponent(TicketListPage);
    for (const [name, value] of Object.entries(params)) {
      fixture.componentRef.setInput(name, value);
    }
    await settle();
  }

  async function loadWith(page: PageResponse<TicketSummary>) {
    tickets().flush(page);
    http.expectOne('/api/v1/categories').flush([{ id: CATEGORY, name: 'Hardware' }]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
    await settle();
  }

  afterEach(() => {
    TestBed.inject(ToastService).clear();
    vi.useRealTimers();
  });

  it('asks for the open tickets, newest first, and shows them with Spanish labels', async () => {
    await setup();
    const request = tickets();
    expect(request.request.params.get('status')).toBe('OPEN,IN_PROGRESS,WAITING');
    expect(request.request.params.get('sort')).toBe('createdAt,desc');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(
      pageOf([
        ticket(),
        ticket({
          id: 't-2',
          ticketCode: 'TCK-000141',
          status: 'IN_PROGRESS',
          agent: { id: 'a-1', fullName: 'Elena Agente' },
        }),
      ]),
    );
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
    await settle();

    expect(text()).toContain('TCK-000142');
    expect(text()).toContain('Laptop no enciende');
    expect(text()).toContain('Sin asignar');
    expect(text()).toContain('En curso');
    expect(text()).toContain('Elena Agente');
    expect(text()).toContain('hace 5 min');
  });

  it('shows the counters of the tabs, and the agent view only to agents', async () => {
    await setup(['AGENT']);
    await loadWith(pageOf([ticket()]));

    const tabs = Array.from(el().querySelectorAll('.link-tab')).map((a) =>
      (a.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
    expect(tabs).toEqual([
      'Abiertos 12',
      'Sin asignar 3',
      'Asignados a mí 5',
      'Prioridad alta 4',
      'Resueltos 5',
      'Todos 29',
    ]);
    expect(el().querySelector('.link-tab.is-active')?.getAttribute('aria-current')).toBe('page');
  });

  it('hides the agent view and the requester column from an ordinary user', async () => {
    await setup(['USER']);
    await loadWith(pageOf([ticket()]));

    expect(text()).not.toContain('Asignados a mí');
    expect(
      Array.from(el().querySelectorAll('th')).map((th) => th.textContent?.trim()),
    ).not.toContain('Solicitante');
  });

  it('turns the view of the URL into the right query', async () => {
    await setup(['AGENT'], { vista: 'mios', buscar: 'vpn', pagina: '3', orden: 'priority,desc' });
    const request = tickets();

    expect(request.request.params.get('assignedTo')).toBe(ME);
    expect(request.request.params.get('status')).toBe('IN_PROGRESS,WAITING');
    expect(request.request.params.get('search')).toBe('vpn');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('sort')).toBe('priority,desc');
    request.flush(pageOf([]));
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
  });

  it('ignores nonsense in the URL instead of failing', async () => {
    await setup(['AGENT'], {
      pagina: 'abc',
      tamano: '999',
      orden: 'passwordHash,asc',
      vista: 'inventada',
    });
    const request = tickets();

    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('sort')).toBe('createdAt,desc');
    expect(request.request.params.get('status')).toBe('OPEN,IN_PROGRESS,WAITING');
    request.flush(pageOf([]));
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
  });

  it('sorts by clicking a header, going back to the first page', async () => {
    await setup(['AGENT'], { pagina: '2' });
    await loadWith(pageOf([ticket()], 60));

    const header = Array.from(el().querySelectorAll('th')).find((th) =>
      th.textContent?.includes('Prioridad'),
    )!;
    header.querySelector('button')!.click();

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { orden: 'priority,desc' } }),
    );
  });

  it('changes page (the URL counts from 1)', async () => {
    await setup(['AGENT']);
    await loadWith(pageOf([ticket()], 60));

    el().querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { pagina: '2' } }),
    );
  });

  it('waits for the person to stop typing before searching', async () => {
    await setup(['AGENT']);
    await loadWith(pageOf([ticket()]));

    vi.useFakeTimers();

    const input = el().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'v';
    input.dispatchEvent(new Event('input'));
    input.value = 'vpn';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(200);
    expect(router.navigate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(150);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { buscar: 'vpn' } }),
    );
  });

  it('offers "Tomar" only on the rows the backend says can be taken', async () => {
    await setup(['AGENT']);
    await loadWith(
      pageOf([
        ticket({ canAssignToSelf: true }),
        ticket({ id: 't-2', ticketCode: 'TCK-000141', canAssignToSelf: false }),
      ]),
    );

    const buttons = Array.from(el().querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Tomar',
    );
    expect(buttons).toHaveLength(1);
    expect(buttons[0].getAttribute('aria-label')).toBe('Tomar el ticket TCK-000142');
  });

  it('takes a ticket, says so, and reloads the list and the counters', async () => {
    await setup(['AGENT']);
    await loadWith(pageOf([ticket({ canAssignToSelf: true })]));

    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Tomar')!
      .click();
    const take = http.expectOne('/api/v1/tickets/t-1/assign');
    expect(take.request.body).toEqual({});
    take.flush({});
    await settle();

    expect(
      TestBed.inject(ToastService)
        .toasts()
        .map((t) => t.message),
    ).toEqual(['Tomaste el ticket TCK-000142.']);
    tickets().flush(pageOf([]));
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
  });

  it('explains it when someone took the ticket first, and still refreshes', async () => {
    await setup(['AGENT']);
    await loadWith(pageOf([ticket({ canAssignToSelf: true })]));

    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Tomar')!
      .click();
    http.expectOne('/api/v1/tickets/t-1/assign').flush(
      {
        timestamp: '',
        status: 409,
        code: 'TICKET_ALREADY_ASSIGNED',
        message: 'x',
        path: '',
        fieldErrors: [],
      },
      { status: 409, statusText: 'Conflict' },
    );
    await settle();

    const toast = TestBed.inject(ToastService).toasts()[0];
    expect(toast.kind).toBe('error');
    expect(toast.message).toBe('Este ticket ya está asignado a otro agente.');
    tickets().flush(pageOf([]));
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
  });

  it('shows the error with a retry button, and retrying reloads', async () => {
    await setup(['AGENT']);
    tickets().flush(
      {
        timestamp: '',
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'detalle',
        path: '',
        fieldErrors: [],
      },
      { status: 500, statusText: 'Error' },
    );
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
    await settle();

    expect(text()).toContain('No pudimos cargar los tickets');
    expect(text()).toContain('Algo salió mal de nuestro lado');
    expect(text()).not.toContain('detalle');

    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Reintentar')!
      .click();
    await settle();
    tickets().flush(pageOf([ticket()]));
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
    await settle();
    expect(text()).toContain('TCK-000142');
  });

  it('tells apart "nothing here" from "nothing matches your search"', async () => {
    await setup(['AGENT']);
    await loadWith(pageOf([]));
    expect(text()).toContain('No hay tickets en esta vista');

    TestBed.resetTestingModule();
    await setup(['AGENT'], { buscar: 'xyz' });
    await loadWith(pageOf([]));
    expect(text()).toContain('Ningún ticket coincide con tu búsqueda');
    expect(text()).toContain('Limpiar filtros');
  });

  it('shows a skeleton while the first page loads', async () => {
    await setup(['AGENT']);
    expect(el().querySelector('[aria-label="Cargando tickets"]')).not.toBeNull();
    tickets().flush(pageOf([]));
    http.expectOne('/api/v1/categories').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
  });
});
