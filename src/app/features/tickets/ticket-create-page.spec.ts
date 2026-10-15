import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketCreatePage } from '@features/tickets/ticket-create-page';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ToastService } from '@shared/ui';

const CATEGORY = 'cat-1';
const created = { id: 't-9', ticketCode: 'TCK-000150' };
const errorBody = (status: number, code: string, fieldErrors: unknown[] = []) => ({
  timestamp: '',
  status,
  code,
  message: 'x',
  path: '',
  fieldErrors,
});

describe('TicketCreatePage', () => {
  let fixture: ComponentFixture<TicketCreatePage>;
  let http: HttpTestingController;
  let router: Router;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const field = (label: string) => {
    const wrapper = Array.from(el().querySelectorAll('app-field')).find((f) =>
      f.querySelector('label')?.textContent?.includes(label),
    )!;
    return wrapper.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea',
    )!;
  };
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  function fill(label: string, value: string, kind: 'input' | 'change' = 'input'): void {
    const control = field(label);
    control.value = value;
    control.dispatchEvent(new Event('input'));
    if (kind === 'change') control.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function fillValid(): void {
    fill('Asunto', '  VPN se desconecta  ');
    fill('Categoría', CATEGORY, 'change');
    fill('Descripción', 'Se corta cada cinco minutos al trabajar desde casa.');
  }

  function submit(): void {
    el()
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(TicketCreatePage);
    await settle();
    http.expectOne('/api/v1/categories').flush([{ id: CATEGORY, name: 'Red' }]);
    http.expectOne('/api/v1/assets/mine').flush([
      {
        id: 'a-1',
        assetTag: 'AST-000045',
        type: 'Laptop',
        brand: 'Dell',
        model: 'Latitude',
        status: 'ASSIGNED',
        location: null,
        assignedTo: null,
      },
    ]);
    await settle();
  });

  afterEach(() => {
    http.verify();
    TestBed.inject(ToastService).clear();
  });

  it('offers the categories, the priorities and the equipment of the person', () => {
    expect(
      Array.from(field('Categoría').querySelectorAll('option')).map((o) => o.textContent?.trim()),
    ).toEqual(['Selecciona una categoría', 'Red']);
    expect(
      Array.from(field('Prioridad').querySelectorAll('option')).map((o) => o.textContent?.trim()),
    ).toEqual(['Baja', 'Media', 'Alta', 'Crítica']);
    expect(field('Equipo relacionado').textContent).toContain('AST-000045 · Dell Latitude');
    expect((field('Prioridad') as HTMLSelectElement).value).toBe('MEDIUM');
  });

  it('does not scold the person before they try to send', () => {
    expect(text()).not.toContain('Escribe un asunto.');
    expect(el().querySelector('[role="alert"]')).toBeNull();
  });

  it('refuses an empty form, says how many fields to fix and does not call the server', () => {
    submit();

    expect(text()).toContain('Escribe un asunto.');
    expect(text()).toContain('Selecciona una categoría.');
    expect(text()).toContain('Describe el problema.');
    expect(text()).toContain('Hay 3 campos por corregir.');
    expect(field('Asunto').getAttribute('aria-invalid')).toBe('true');
    http.expectNone('/api/v1/tickets');
  });

  it('moves the focus to the first field with an error', async () => {
    submit();
    await settle();
    expect(document.activeElement).toBe(field('Asunto'));
  });

  it('treats a title or description made of spaces as empty', () => {
    fill('Asunto', '     ');
    fill('Categoría', CATEGORY, 'change');
    fill('Descripción', '                    ');
    submit();

    expect(text()).toContain('Escribe un asunto.');
    expect(text()).toContain('Describe el problema.');
    http.expectNone('/api/v1/tickets');
  });

  it('requires a minimum of characters in the description', () => {
    fill('Asunto', 'Algo');
    fill('Categoría', CATEGORY, 'change');
    fill('Descripción', 'corta');
    submit();

    expect(text()).toContain('La descripción debe tener al menos 10 caracteres.');
  });

  it('refuses a title that is too long', () => {
    fill('Asunto', 'x'.repeat(201));
    submit();
    expect(text()).toContain('El asunto no puede superar los 200 caracteres.');
  });

  it('sends the trimmed data, thanks the person and opens the new ticket', async () => {
    fillValid();
    submit();

    const request = http.expectOne('/api/v1/tickets');
    expect(request.request.body).toEqual({
      title: 'VPN se desconecta',
      description: 'Se corta cada cinco minutos al trabajar desde casa.',
      categoryId: CATEGORY,
      priority: 'MEDIUM',
      assetId: null,
    });
    request.flush(created);
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe('Creaste el ticket TCK-000150.');
    expect(router.navigate).toHaveBeenCalledWith(['/tickets', 't-9']);
  });

  it('sends the linked equipment when one is chosen', () => {
    fillValid();
    fill('Equipo relacionado', 'a-1', 'change');
    submit();

    expect(http.expectOne('/api/v1/tickets').request.body.assetId).toBe('a-1');
  });

  it('ignores a second submit while the first is in flight', () => {
    fillValid();
    submit();
    submit();
    http.expectOne('/api/v1/tickets'); // expectOne falla si hubiera dos peticiones
  });

  it('shows the errors of the server next to their field', async () => {
    fillValid();
    submit();
    http
      .expectOne('/api/v1/tickets')
      .flush(
        errorBody(400, 'VALIDATION_ERROR', [
          { field: 'categoryId', code: 'NotNull', message: 'must not be null' },
        ]),
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(text()).toContain('Selecciona una categoría.');
    expect(text()).not.toContain('must not be null');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shows a general error above the form when the failure is not about a field', async () => {
    fillValid();
    submit();
    http
      .expectOne('/api/v1/tickets')
      .flush(errorBody(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
    await settle();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain(
      'Algo salió mal de nuestro lado',
    );
    expect((field('Asunto') as HTMLInputElement).value).toBe('  VPN se desconecta  '); // no se pierde lo escrito
  });

  describe('unsaved changes', () => {
    it('has none in the beginning', () => {
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });

    it.each([
      ['Asunto', 'algo', 'input' as const],
      ['Descripción', 'algo', 'input' as const],
      ['Categoría', CATEGORY, 'change' as const],
      ['Prioridad', 'HIGH', 'change' as const],
      ['Equipo relacionado', 'a-1', 'change' as const],
    ])('detects a change in %s', (label, value, kind) => {
      fill(label, value, kind);
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    });

    it('does not count a field with only spaces', () => {
      fill('Asunto', '    ');
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });

    it('warns the browser before a tab close or reload, but only when there is something to lose', () => {
      const clean = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(clean);
      expect(clean.defaultPrevented).toBe(false);

      fill('Asunto', 'algo');
      const dirty = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(dirty);
      expect(dirty.defaultPrevented).toBe(true);
    });

    it('stops asking once the ticket is created', async () => {
      fillValid();
      submit();
      http.expectOne('/api/v1/tickets').flush(created);
      await settle();

      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });
  });
});
