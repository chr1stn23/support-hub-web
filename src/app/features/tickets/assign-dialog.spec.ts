import { Ticket } from '@core/api/models';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AssignDialog } from '@features/tickets/assign-dialog';
import { provideHttpClient } from '@angular/common/http';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ToastService } from '@shared/ui';

const ticket = (agent: Ticket['agent']): Ticket => ({
  id: 't-1',
  ticketCode: 'TCK-000142',
  title: 'Laptop',
  description: 'No enciende',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  category: { id: 'c-1', name: 'Hardware' },
  requester: { id: 'u-9', fullName: 'Lucía' },
  agent,
  asset: null,
  createdAt: '',
  updatedAt: '',
  resolvedAt: null,
  closedAt: null,
  version: 1,
  actions: {
    editContent: true,
    editTriage: true,
    comment: true,
    attach: true,
    assignToSelf: true,
    assignToOthers: true,
    changeStatus: [],
  },
});

const person = (id: string, fullName: string) => ({ id, fullName, email: `${id}@x.com` });
const page = (...content: ReturnType<typeof person>[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});
const errorBody = (status: number, code: string) => ({
  timestamp: '',
  status,
  code,
  message: 'x',
  path: '',
  fieldErrors: [],
});

describe('AssignDialog', () => {
  let fixture: ComponentFixture<AssignDialog>;
  let http: HttpTestingController;
  let close: ReturnType<typeof vi.fn>;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const select = () => el().querySelector<HTMLSelectElement>('select')!;
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup(
    data: Ticket,
    agents = [person('a-1', 'Carlos Agente'), person('a-2', 'Elena Agente')],
    admins = [person('a-9', 'Ana Admin')],
  ) {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: { ticket: data } },
        { provide: DialogRef, useValue: { close } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssignDialog);
    await settle();
    http.expectOne((r) => r.params.get('role') === 'AGENT').flush(page(...agents));
    http.expectOne((r) => r.params.get('role') === 'ADMIN').flush(page(...admins));
    await settle();
  }

  function choose(id: string): void {
    select().value = id;
    select().dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function submit(): void {
    el()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    TestBed.inject(ToastService).clear();
  });

  it('offers agents and administrators, sorted, without whoever already has the ticket', async () => {
    await setup(ticket({ id: 'a-1', fullName: 'Carlos Agente' }));
    const names = Array.from(select().querySelectorAll('option')).map((o) => o.textContent?.trim());

    expect(names).toEqual(['Selecciona una persona', 'Ana Admin', 'Elena Agente']);
    expect(text()).toContain('Ahora lo atiende Carlos Agente.');
  });

  it('asks the person to choose before sending', async () => {
    await setup(ticket(null));
    submit();

    expect(text()).toContain('Selecciona a quién asignarlo.');
    http.expectNone('/api/v1/tickets/t-1/assign');
  });

  it('assigns, thanks the person and asks for a reload', async () => {
    await setup(ticket(null));
    choose('a-2');
    submit();

    const request = http.expectOne('/api/v1/tickets/t-1/assign');
    expect(request.request.body).toEqual({ agentId: 'a-2' });
    request.flush(ticket({ id: 'a-2', fullName: 'Elena Agente' }));
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'El ticket TCK-000142 ahora lo atiende Elena Agente.',
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('says so when there is nobody else to assign it to', async () => {
    await setup(
      ticket({ id: 'a-1', fullName: 'Carlos Agente' }),
      [person('a-1', 'Carlos Agente')],
      [],
    );
    expect(text()).toContain('No hay otras personas a quienes asignar este ticket.');
    expect(el().querySelector('button[type="submit"]')).toBeNull();
  });

  it('when the ticket changed meanwhile, explains it and asks for a reload', async () => {
    await setup(ticket(null));
    choose('a-2');
    submit();
    http
      .expectOne('/api/v1/tickets/t-1/assign')
      .flush(errorBody(409, 'TICKET_NOT_ASSIGNABLE'), { status: 409, statusText: 'Conflict' });
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Un ticket en este estado ya no se puede asignar.',
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('stays open when the chosen person cannot receive tickets', async () => {
    await setup(ticket(null));
    choose('a-2');
    submit();
    http
      .expectOne('/api/v1/tickets/t-1/assign')
      .flush(errorBody(400, 'INVALID_ASSIGNEE'), { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(el().querySelector('.callout')?.textContent).toContain('La persona elegida no existe');
    expect(close).not.toHaveBeenCalled();
  });

  it('offers a retry when the people cannot be loaded', async () => {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: { ticket: ticket(null) } },
        { provide: DialogRef, useValue: { close } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssignDialog);
    await settle();

    const agentRequest = http.expectOne((r) => r.params.get('role') === 'AGENT');
    const adminRequest = http.expectOne((r) => r.params.get('role') === 'ADMIN');

    adminRequest.flush(page());
    agentRequest.flush(errorBody(500, 'INTERNAL_ERROR'), {
      status: 500,
      statusText: 'Error',
    });
    await settle();

    expect(text()).toContain('No pudimos cargar a las personas');
    expect(
      Array.from(el().querySelectorAll('button')).some(
        (b) => b.textContent?.trim() === 'Reintentar',
      ),
    ).toBe(true);
  });
});
