import { Ticket, TicketActions } from '@core/api/models';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditTicketDialog } from '@features/tickets/edit-ticket-dialog';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ToastService } from '@shared/ui';

const full: TicketActions = {
  editContent: true,
  editTriage: true,
  comment: true,
  attach: true,
  assignToSelf: false,
  assignToOthers: false,
  changeStatus: [],
};
const requesterOnly: TicketActions = { ...full, editTriage: false };

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 't-1',
  ticketCode: 'TCK-000142',
  title: 'VPN caída',
  description: 'Se corta cada cinco minutos.',
  status: 'OPEN',
  priority: 'MEDIUM',
  category: { id: 'cat-1', name: 'Red' },
  requester: { id: 'u-9', fullName: 'Lucía' },
  agent: null,
  asset: null,
  createdAt: '',
  updatedAt: '',
  resolvedAt: null,
  closedAt: null,
  version: 4,
  actions: full,
  ...overrides,
});

const URL = '/api/v1/tickets/t-1';
const errorBody = (status: number, code: string, fieldErrors: unknown[] = []) => ({
  timestamp: '',
  status,
  code,
  message: 'x',
  path: '',
  fieldErrors,
});

describe('EditTicketDialog', () => {
  let fixture: ComponentFixture<EditTicketDialog>;
  let http: HttpTestingController;
  let close: ReturnType<typeof vi.fn>;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const save = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const field = (label: string) => {
    const wrapper = Array.from(el().querySelectorAll('app-field')).find((f) =>
      f.querySelector('label')?.textContent?.includes(label),
    );
    return (
      wrapper?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input, select, textarea',
      ) ?? null
    );
  };
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup(data: Ticket) {
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
    fixture = TestBed.createComponent(EditTicketDialog);
    await settle();
    if (data.actions.editTriage) {
      http.expectOne('/api/v1/categories').flush([
        { id: 'cat-1', name: 'Red' },
        { id: 'cat-2', name: 'Hardware' },
      ]);
      await settle();
    }
  }

  function fill(label: string, value: string, kind: 'input' | 'change' = 'input'): void {
    const control = field(label)!;
    control.value = value;
    control.dispatchEvent(new Event('input'));
    if (kind === 'change') control.dispatchEvent(new Event('change'));
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

  it('starts with the current values, and "Guardar" disabled until something changes', async () => {
    await setup(ticket());
    expect((field('Asunto') as HTMLInputElement).value).toBe('VPN caída');
    expect((field('Descripción') as HTMLTextAreaElement).value).toBe(
      'Se corta cada cinco minutos.',
    );
    expect(save().hasAttribute('disabled')).toBe(true);

    fill('Asunto', 'VPN caída en casa');
    expect(save().hasAttribute('disabled')).toBe(false);
  });

  it('shows the current category from the first moment, even before the list loads', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: { ticket: ticket() } },
        { provide: DialogRef, useValue: { close: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EditTicketDialog);
    fixture.detectChanges();

    expect(
      Array.from(field('Categoría')!.querySelectorAll('option')).map((o) => o.textContent?.trim()),
    ).toEqual(['Red']);
    http.expectOne('/api/v1/categories').flush([
      { id: 'cat-1', name: 'Red' },
      { id: 'cat-2', name: 'Hardware' },
    ]);
  });

  it('hides category and priority from whoever may not edit them', async () => {
    await setup(ticket({ actions: requesterOnly }));
    expect(field('Categoría')).toBeNull();
    expect(field('Prioridad')).toBeNull();
    expect(field('Asunto')).not.toBeNull();
    http.expectNone('/api/v1/categories');
  });

  it('sends only the changed fields, with the version that was read', async () => {
    await setup(ticket());
    fill('Asunto', '  VPN caída en casa ');
    fill('Prioridad', 'CRITICAL', 'change');
    submit();

    const request = http.expectOne(URL);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      version: 4,
      title: 'VPN caída en casa',
      priority: 'CRITICAL',
    });
    request.flush(ticket());
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Guardaste los cambios del ticket.',
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('validates before sending, and says what is wrong', async () => {
    await setup(ticket());
    fill('Asunto', '    ');
    fill('Descripción', 'corta');
    submit();

    expect(text()).toContain('Escribe un asunto.');
    expect(text()).toContain('La descripción debe tener al menos 10 caracteres.');
    http.expectNone(URL);
  });

  it('refuses a title that is too long', async () => {
    await setup(ticket());
    fill('Asunto', 'x'.repeat(201));
    submit();
    expect(text()).toContain('El asunto no puede superar los 200 caracteres.');
    http.expectNone(URL);
  });

  it('shows the errors of the server next to their field', async () => {
    await setup(ticket());
    fill('Asunto', 'Nuevo asunto');
    submit();
    http
      .expectOne(URL)
      .flush(
        errorBody(400, 'VALIDATION_ERROR', [{ field: 'title', code: 'Size', message: 'size' }]),
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(text()).toContain('El asunto no puede superar los 200 caracteres.');
    expect(close).not.toHaveBeenCalled();
  });

  describe('when someone else edited the ticket meanwhile', () => {
    async function conflict() {
      await setup(ticket());
      fill('Asunto', 'Mi título nuevo');
      submit();
      http
        .expectOne(URL)
        .flush(errorBody(409, 'CONCURRENT_MODIFICATION'), { status: 409, statusText: 'Conflict' });
      await settle();
      // El diálogo trae la versión actual del ticket
      http.expectOne(URL).flush(
        ticket({
          version: 5,
          priority: 'CRITICAL',
          description: 'Descripción revisada por el agente.',
        }),
      );
      await settle();
    }

    it('explains it, keeps what the person changed and brings in the rest', async () => {
      await conflict();

      expect(text()).toContain('Alguien más modificó este ticket mientras lo editabas');
      expect((field('Asunto') as HTMLInputElement).value).toBe('Mi título nuevo');
      expect((field('Descripción') as HTMLTextAreaElement).value).toBe(
        'Descripción revisada por el agente.',
      );
      expect((field('Prioridad') as HTMLSelectElement).value).toBe('CRITICAL');
      expect(close).not.toHaveBeenCalled();
    });

    it("saves again with the new version, sending only the person's own change", async () => {
      await conflict();
      submit();

      const request = http.expectOne(URL);
      expect(request.request.body).toEqual({ version: 5, title: 'Mi título nuevo' });
      request.flush(ticket({ version: 6 }));
      await settle();
      expect(close).toHaveBeenCalledWith(true);
    });
  });

  it('closes and asks for a reload when the ticket was locked meanwhile', async () => {
    await setup(ticket());
    fill('Asunto', 'Tarde');
    submit();
    http
      .expectOne(URL)
      .flush(errorBody(409, 'TICKET_LOCKED'), { status: 409, statusText: 'Conflict' });
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Este ticket está cerrado o cancelado y ya no admite cambios.',
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('shows a general error for any other failure, keeping what was typed', async () => {
    await setup(ticket());
    fill('Asunto', 'Algo nuevo');
    submit();
    http
      .expectOne(URL)
      .flush(errorBody(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
    await settle();

    expect(el().querySelector('.callout--error')?.textContent).toContain(
      'Algo salió mal de nuestro lado',
    );
    expect((field('Asunto') as HTMLInputElement).value).toBe('Algo nuevo');
    expect(close).not.toHaveBeenCalled();
  });

  it('ignores a second submit while the first is in flight', async () => {
    await setup(ticket());
    fill('Asunto', 'Una sola vez');
    submit();
    submit();
    http.expectOne(URL); // expectOne falla si hubiera dos peticiones
  });
});
