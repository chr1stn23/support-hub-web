import { Ticket, TicketStatus, TicketStatusOption } from '@core/api/models';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusDialog } from '@features/tickets/status-dialog';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ToastService } from '@shared/ui';

const ticket = (
  changeStatus: TicketStatusOption[],
  status: TicketStatus = 'IN_PROGRESS',
): Ticket => ({
  id: 't-1',
  ticketCode: 'TCK-000142',
  title: 'Laptop',
  description: 'No enciende',
  status,
  priority: 'HIGH',
  category: { id: 'c-1', name: 'Hardware' },
  requester: { id: 'u-9', fullName: 'Lucía' },
  agent: { id: 'a-1', fullName: 'Carlos' },
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
    assignToSelf: false,
    assignToOthers: false,
    changeStatus,
  },
});

const URL = '/api/v1/tickets/t-1/status';
const errorBody = (status: number, code: string) => ({
  timestamp: '',
  status,
  code,
  message: 'x',
  path: '',
  fieldErrors: [],
});

describe('StatusDialog', () => {
  let fixture: ComponentFixture<StatusDialog>;
  let http: HttpTestingController;
  let close: ReturnType<typeof vi.fn>;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const radios = () => Array.from(el().querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  const settle = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  function setup(data: Ticket) {
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
    fixture = TestBed.createComponent(StatusDialog);
    fixture.detectChanges();
  }

  function pick(index: number): void {
    radios()[index].click();
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

  const inProgress: TicketStatusOption[] = [
    { status: 'WAITING', noteRequired: false },
    { status: 'RESOLVED', noteRequired: false },
    { status: 'CANCELLED', noteRequired: false },
  ];

  it('offers exactly the transitions the server allows', () => {
    setup(ticket(inProgress));
    expect(text()).toContain('Poner en espera');
    expect(text()).toContain('Marcar como resuelto');
    expect(text()).toContain('Cancelar ticket');
    expect(radios()).toHaveLength(3);
    expect(text()).not.toContain('Reabrir');
  });

  it('preselects the option when there is only one', () => {
    setup(ticket([{ status: 'CANCELLED', noteRequired: false }], 'OPEN'));
    expect(radios()).toHaveLength(1);
    expect(radios()[0].checked).toBe(true);
  });

  it('asks the person to choose when there are several', () => {
    setup(ticket(inProgress));
    submit();

    expect(text()).toContain('Selecciona el nuevo estado.');
    http.expectNone(URL);
  });

  it('makes the note optional, with a hint, for an ordinary change', () => {
    setup(ticket(inProgress));
    pick(1);
    expect(text()).toContain('Opcional. Quedará en el historial del ticket.');
    expect(el().querySelector('app-field label .required')).toBeNull();
  });

  it('makes the note mandatory when the server says so (reopening)', () => {
    setup(
      ticket(
        [
          { status: 'IN_PROGRESS', noteRequired: true },
          { status: 'CLOSED', noteRequired: false },
        ],
        'RESOLVED',
      ),
    );
    pick(0);

    expect(text()).toContain('Obligatoria al reabrir');
    expect(el().querySelector('app-field label .required')).not.toBeNull();

    submit();
    expect(text()).toContain('Escribe una nota explicando el motivo.');
    http.expectNone(URL);
  });

  it('does not accept a mandatory note made only of spaces', () => {
    setup(ticket([{ status: 'IN_PROGRESS', noteRequired: true }], 'RESOLVED'));
    const note = el().querySelector<HTMLTextAreaElement>('textarea')!;
    note.value = '     ';
    note.dispatchEvent(new Event('input'));
    submit();

    expect(text()).toContain('Escribe una nota explicando el motivo.');
    http.expectNone(URL);
  });

  it('refuses a note that is too long', () => {
    setup(ticket(inProgress));
    pick(0);
    const note = el().querySelector<HTMLTextAreaElement>('textarea')!;
    note.value = 'x'.repeat(501);
    note.dispatchEvent(new Event('input'));
    submit();

    expect(text()).toContain('La nota no puede superar los 500 caracteres.');
    http.expectNone(URL);
  });

  it('warns about the irreversible options, and colours the confirmation red', () => {
    setup(ticket(inProgress));
    expect(text()).toContain('Es definitivo');

    pick(0);
    const confirm = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(confirm().classList).toContain('btn--primary');
    pick(2);
    expect(confirm().classList).toContain('btn--danger');
  });

  it('sends the status with the trimmed note, thanks the person and asks for a reload', async () => {
    setup(ticket(inProgress));
    pick(1);
    const note = el().querySelector<HTMLTextAreaElement>('textarea')!;
    note.value = '  Se reemplazó la batería  ';
    note.dispatchEvent(new Event('input'));
    submit();

    const request = http.expectOne(URL);
    expect(request.request.body).toEqual({ status: 'RESOLVED', note: 'Se reemplazó la batería' });
    request.flush(ticket([]));
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'El ticket TCK-000142 ahora está «Resuelto».',
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('sends no note when it is left empty', () => {
    setup(ticket(inProgress));
    pick(0);
    submit();

    expect(http.expectOne(URL).request.body).toEqual({ status: 'WAITING', note: null });
  });

  it('closes without reloading when the person cancels', () => {
    setup(ticket(inProgress));
    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Cancelar')!
      .click();
    expect(close).toHaveBeenCalledWith(false);
  });

  it('ignores a second submit while the first is in flight', () => {
    setup(ticket(inProgress));
    pick(0);
    submit();
    submit();
    http.expectOne(URL); // expectOne falla si hubiera dos peticiones
  });

  it('when the ticket changed meanwhile, explains it, closes and asks for a reload', async () => {
    setup(ticket(inProgress));
    pick(1);
    submit();
    http
      .expectOne(URL)
      .flush(errorBody(409, 'INVALID_STATUS_TRANSITION'), { status: 409, statusText: 'Conflict' });
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Ese cambio de estado no está permitido para este ticket.',
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('stays open, with the message, for any other failure', async () => {
    setup(ticket(inProgress));
    pick(1);
    submit();
    http
      .expectOne(URL)
      .flush(errorBody(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
    await settle();

    expect(el().querySelector('.callout')?.textContent).toContain('Algo salió mal de nuestro lado');
    expect(close).not.toHaveBeenCalled();
  });
});
