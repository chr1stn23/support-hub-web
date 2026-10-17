import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Ticket, TicketComment, TicketHistoryEvent } from '@core/api/models';
import { TicketDetailPage } from '@features/tickets/ticket-detail-page';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { DialogService, ToastService } from '@shared/ui';
import { Title } from '@angular/platform-browser';
import { StatusDialog } from '@features/tickets/status-dialog';
import { AssignDialog } from '@features/tickets/assign-dialog';
import { EditTicketDialog } from '@features/tickets/edit-ticket-dialog';
import { of } from 'rxjs';

const T = '/api/v1/tickets/t-1';

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 't-1',
  ticketCode: 'TCK-000142',
  title: 'Laptop no enciende',
  description: 'No prende desde ayer.\nYa probé otro cargador.',
  status: 'OPEN',
  priority: 'HIGH',
  category: { id: 'c-1', name: 'Hardware' },
  requester: { id: 'u-9', fullName: 'Lucía Usuaria' },
  agent: null,
  asset: { id: 'a-1', assetTag: 'AST-000045', brand: 'Dell', model: 'Latitude 5440' },
  createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  updatedAt: new Date().toISOString(),
  resolvedAt: null,
  closedAt: null,
  version: 0,
  actions: {
    editContent: true,
    editTriage: false,
    comment: true,
    attach: true,
    assignToSelf: true,
    assignToOthers: false,
    changeStatus: [],
  },
  ...overrides,
});

const comments: TicketComment[] = [
  {
    id: 'c-1',
    author: { id: 'u-9', fullName: 'Lucía Usuaria' },
    body: 'Adjunto detalles',
    createdAt: new Date(Date.now() - 600_000).toISOString(),
  },
  {
    id: 'c-2',
    author: { id: 'a-1', fullName: 'Carlos Agente' },
    body: 'Lo reviso hoy',
    createdAt: new Date().toISOString(),
  },
];

const history: TicketHistoryEvent[] = [
  {
    id: 'e-1',
    eventType: 'CREATED',
    actor: { id: 'u-9', fullName: 'Lucía Usuaria' },
    oldValue: null,
    newValue: 'OPEN',
    note: null,
    createdAt: '2026-10-08T14:00:00Z',
  },
  {
    id: 'e-2',
    eventType: 'ASSIGNED',
    actor: { id: 'a-1', fullName: 'Carlos Agente' },
    oldValue: null,
    newValue: 'Carlos Agente',
    note: null,
    createdAt: '2026-10-08T15:00:00Z',
  },
];

const errorBody = (status: number, code: string) => ({
  timestamp: '',
  status,
  code,
  message: 'x',
  path: '',
  fieldErrors: [],
});

describe('TicketDetailPage', () => {
  let fixture: ComponentFixture<TicketDetailPage>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup(data: Ticket = ticket()) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TicketDetailPage);
    fixture.componentRef.setInput('id', 't-1');
    await settle();

    http.expectOne(T).flush(data);
    http.expectOne(`${T}/comments`).flush(comments);
    http.expectOne(`${T}/history`).flush(history);
    await settle();
    http.expectOne(`${T}/attachments`).flush([]);
    await settle();
  }

  afterEach(() => TestBed.inject(ToastService).clear());

  it('shows the header: code, title, status and priority', async () => {
    await setup();
    expect(el().querySelector('h1')?.textContent).toBe('Laptop no enciende');
    expect(text()).toContain('TCK-000142');
    expect(text()).toContain('Sin asignar');
    expect(text()).toContain('Alta');
  });

  it('shows the description with its line breaks, as plain text', async () => {
    await setup(ticket({ description: '<b>no soy html</b>\nsegunda línea' }));
    const description = el()
      .querySelector('#description-title')!
      .parentElement!.querySelector('.text')!;
    expect(description.textContent).toBe('<b>no soy html</b>\nsegunda línea');
    expect(description.querySelector('b')).toBeNull();
  });

  it('shows the side details', async () => {
    await setup();
    const side = (el().querySelector('.side')?.textContent ?? '').replace(/\s+/g, ' ');
    expect(side).toContain('Lucía Usuaria');
    expect(side).toContain('Sin asignar');
    expect(side).toContain('Hardware');
    expect(side).toContain('AST-000045');
    expect(side).toContain('Dell Latitude 5440');
  });

  it('says there is no equipment when none is linked', async () => {
    await setup(ticket({ asset: null }));
    expect(text()).toContain('Ninguno');
  });

  it('lists the comments in order, marking the requester', async () => {
    await setup();
    const items = Array.from(el().querySelectorAll('.comment'));
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Adjunto detalles');
    expect(items[0].textContent).toContain('Solicitante');
    expect(items[1].textContent).toContain('Lo reviso hoy');
    expect(items[1].textContent).not.toContain('Solicitante');
    expect(text()).toContain('Comentarios 2');
  });

  it('shows the history, most recent first', async () => {
    await setup();
    const items = Array.from(el().querySelectorAll('app-history-timeline .item')).map((i) =>
      (i.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
    expect(items[0]).toContain('Carlos Agente tomó el ticket');
    expect(items[1]).toContain('Lucía Usuaria creó el ticket');
  });

  it('shows the attachments section, with the upload area only when the ticket allows it', async () => {
    await setup();
    expect(el().querySelector('app-attachments-section')).not.toBeNull();
    expect(el().querySelector('.drop')).not.toBeNull();
  });

  it('offers "Tomar ticket" when the server says it can be taken', async () => {
    await setup();
    const button = Array.from(el().querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Tomar ticket',
    );
    expect(button).toBeTruthy();
  });

  it('calls it "Asignármelo" when the ticket already has an agent', async () => {
    await setup(ticket({ agent: { id: 'a-2', fullName: 'Elena Agente' } }));
    expect(
      Array.from(el().querySelectorAll('button')).some(
        (b) => b.textContent?.trim() === 'Asignármelo',
      ),
    ).toBe(true);
  });

  it('shows no take button when the server does not allow it', async () => {
    await setup(ticket({ actions: { ...ticket().actions, assignToSelf: false } }));
    expect(text()).not.toContain('Tomar ticket');
    expect(text()).not.toContain('Asignármelo');
  });

  it('takes the ticket, says so, and reloads the ticket and its history', async () => {
    await setup();
    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Tomar ticket')!
      .click();

    const take = http.expectOne(`${T}/assign`);
    expect(take.request.body).toEqual({});
    take.flush(ticket({ status: 'IN_PROGRESS' }));
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe('Tomaste el ticket TCK-000142.');
    http.expectOne(T).flush(
      ticket({
        status: 'IN_PROGRESS',
        agent: { id: 'a-1', fullName: 'Carlos Agente' },
        actions: { ...ticket().actions, assignToSelf: false },
      }),
    );
    http.expectOne(`${T}/history`).flush(history);
    await settle();

    expect(text()).toContain('En curso');
    expect(text()).not.toContain('Tomar ticket');
  });

  it('explains it, and still refreshes, when someone else took it first', async () => {
    await setup();
    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Tomar ticket')!
      .click();
    http
      .expectOne(`${T}/assign`)
      .flush(errorBody(409, 'TICKET_ALREADY_ASSIGNED'), { status: 409, statusText: 'Conflict' });
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Este ticket ya está asignado a otro agente.',
    );
    http.expectOne(T).flush(ticket());
    http.expectOne(`${T}/history`).flush(history);
  });

  it('replaces the comment box with a notice when the ticket no longer admits comments', async () => {
    await setup(
      ticket({
        status: 'CLOSED',
        actions: { ...ticket().actions, comment: false, assignToSelf: false },
      }),
    );
    expect(el().querySelector('app-comment-form')).toBeNull();
    expect(text()).toContain('ya no admite comentarios');
  });

  it('reloads the comments after posting one', async () => {
    await setup();
    const textarea = el().querySelector<HTMLTextAreaElement>('app-comment-form textarea')!;
    textarea.value = 'Otro comentario';
    textarea.dispatchEvent(new Event('input'));
    el()
      .querySelector('app-comment-form form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();

    http.expectOne(`${T}/comments`).flush({
      id: 'c-3',
      author: { id: 'u-9', fullName: 'Lucía Usuaria' },
      body: 'Otro comentario',
      createdAt: new Date().toISOString(),
    });
    await settle();

    http.expectOne(`${T}/comments`).flush([
      ...comments,
      {
        id: 'c-3',
        author: { id: 'u-9', fullName: 'Lucía Usuaria' },
        body: 'Otro comentario',
        createdAt: new Date().toISOString(),
      },
    ]);
    await settle();
    expect(text()).toContain('Comentarios 3');
  });

  it('says the ticket was not found on a 404 (which is also what a missing permission looks like)', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TicketDetailPage);
    fixture.componentRef.setInput('id', 't-1');
    await settle();

    http
      .expectOne(T)
      .flush(errorBody(404, 'RESOURCE_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
    http
      .expectOne(`${T}/comments`)
      .flush(errorBody(404, 'RESOURCE_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
    http
      .expectOne(`${T}/history`)
      .flush(errorBody(404, 'RESOURCE_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
    await settle();

    expect(text()).toContain('No encontramos este ticket');
    expect(el().querySelector('h1')).toBeNull();
  });

  it('shows an error with a retry for other failures, and the retry reloads everything', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TicketDetailPage);
    fixture.componentRef.setInput('id', 't-1');
    await settle();

    http.expectOne(T).flush(errorBody(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
    http.expectOne(`${T}/comments`).flush(comments);
    http.expectOne(`${T}/history`).flush(history);
    await settle();
    expect(text()).toContain('No pudimos cargar el ticket');

    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Reintentar')!
      .click();
    await settle();
    http.expectOne(T).flush(ticket());
    http.expectOne(`${T}/comments`).flush(comments);
    http.expectOne(`${T}/history`).flush(history);
    await settle();
    expect(el().querySelector('h1')?.textContent).toBe('Laptop no enciende');
  });

  it('keeps the page usable when only the history fails', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TicketDetailPage);
    fixture.componentRef.setInput('id', 't-1');
    await settle();

    http.expectOne(T).flush(ticket());
    http.expectOne(`${T}/comments`).flush(comments);
    http
      .expectOne(`${T}/history`)
      .flush(errorBody(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
    await settle();

    expect(el().querySelector('h1')?.textContent).toBe('Laptop no enciende');
    expect(text()).toContain('No pudimos cargar el historial');
  });

  it('puts the ticket in the title of the browser tab', async () => {
    await setup();
    expect(TestBed.inject(Title).getTitle()).toBe('TCK-000142 · SupportHub');
  });

  it('never shows the data of the previous ticket under the new address', async () => {
    await setup();
    fixture.componentRef.setInput('id', 't-2');
    await settle();

    expect(el().querySelector('h1')).toBeNull(); // ni un instante se ve el ticket t-1 bajo la URL de t-2
    expect(el().querySelector('[aria-label="Cargando el ticket"]')).not.toBeNull();

    http
      .expectOne('/api/v1/tickets/t-2')
      .flush(ticket({ id: 't-2', ticketCode: 'TCK-000150', title: 'Otro' }));
    http.expectOne('/api/v1/tickets/t-2/comments').flush([]);
    http.expectOne('/api/v1/tickets/t-2/history').flush(history);
    await settle();
    expect(el().querySelector('h1')?.textContent).toBe('Otro');
  });

  describe('actions on the ticket', () => {
    const withActions = (actions: Partial<Ticket['actions']>) =>
      ticket({ actions: { ...ticket().actions, assignToSelf: false, ...actions } });
    const button = (label: string) =>
      Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.trim() === label);

    it('shows only the actions the server offers', async () => {
      await setup(withActions({ editContent: false, editTriage: false, changeStatus: [] }));
      expect(button('Cambiar estado')).toBeUndefined();
      expect(button('Asignar a…')).toBeUndefined();
      expect(button('Editar')).toBeUndefined();
    });

    it('shows them all to someone who may do everything', async () => {
      await setup(
        withActions({
          assignToOthers: true,
          changeStatus: [{ status: 'WAITING', noteRequired: false }],
        }),
      );
      expect(button('Cambiar estado')).toBeTruthy();
      expect(button('Asignar a…')).toBeTruthy();
      expect(button('Editar')).toBeTruthy();
    });

    it.each([
      ['Cambiar estado', StatusDialog],
      ['Asignar a…', AssignDialog],
      ['Editar', EditTicketDialog],
    ] as const)(
      '"%s" opens its dialog with the ticket, and reloads when the dialog says so',
      async (label, component) => {
        await setup(
          withActions({
            assignToOthers: true,
            changeStatus: [{ status: 'WAITING', noteRequired: false }],
          }),
        );
        const open = vi
          .spyOn(TestBed.inject(DialogService), 'open')
          .mockReturnValue({ closed: of(true) } as never);

        button(label)!.click();
        await settle();

        expect(open).toHaveBeenCalledWith(
          component,
          expect.objectContaining({ data: { ticket: expect.objectContaining({ id: 't-1' }) } }),
        );
        http.expectOne(T).flush(ticket());
        http.expectOne(`${T}/history`).flush(history);
      },
    );

    it('does not reload when the dialog is cancelled', async () => {
      await setup(withActions({ changeStatus: [{ status: 'WAITING', noteRequired: false }] }));
      vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({
        closed: of(false),
      } as never);

      button('Cambiar estado')!.click();
      await settle();

      http.expectNone(T);
    });
  });
});
