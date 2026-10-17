import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import type { AssetAssignment, AssetDetail, TicketSummary } from '@core/api/models';
import { DialogService, ToastService } from '@shared/ui';
import { AssetAssignDialog } from './asset-assign-dialog';
import { AssetDetailPage } from './asset-detail-page';
import { AssetFormDialog } from './asset-form-dialog';
import { apiError, assetDetail, assignedAsset } from './asset-fixtures';
import { AssetStatusDialog } from './asset-status-dialog';

const A = '/api/v1/assets/a-1';

const assignments: AssetAssignment[] = [
  {
    id: 'x-1',
    user: { id: 'u-9', fullName: 'Lucía Usuaria' },
    assignedBy: { id: 'u-5', fullName: 'Mario Activos' },
    assignedAt: '2026-10-05T15:00:00Z',
    returnedAt: null,
    notes: 'Para el trabajo remoto',
  },
];

const ticket = (overrides: Partial<TicketSummary> = {}): TicketSummary => ({
  id: 't-1',
  ticketCode: 'TCK-000142',
  title: 'Laptop no enciende',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  categoryName: 'Hardware',
  requester: { id: 'u-9', fullName: 'Lucía Usuaria' },
  agent: null,
  createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  updatedAt: new Date().toISOString(),
  canAssignToSelf: false,
  ...overrides,
});

describe('AssetDetailPage', () => {
  let fixture: ComponentFixture<AssetDetailPage>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const button = (label: string) =>
    Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.trim() === label);
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  function create(id = 'a-1') {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssetDetailPage);
    fixture.componentRef.setInput('id', id);
  }

  async function setup(data: AssetDetail = assetDetail(), related: TicketSummary[] = []) {
    create();
    await settle();
    http.expectOne(A).flush(data);
    http.expectOne(`${A}/assignments`).flush(assignments);
    http.expectOne(`${A}/tickets`).flush(related);
    await settle();
  }

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    TestBed.inject(ToastService).clear();
  });

  describe('the data', () => {
    it('shows the header: tag, title, status and type', async () => {
      await setup();
      expect(el().querySelector('h1')?.textContent).toBe('Dell Latitude 5440');
      expect(text()).toContain('AST-000045');
      expect(text()).toContain('Disponible');
      expect(el().querySelector('.kind')?.textContent).toBe('Laptop');
    });

    it('shows the side details', async () => {
      await setup(assignedAsset());
      const side = (el().querySelector('.side')?.textContent ?? '').replace(/\s+/g, ' ');
      expect(side).toContain('Lucía Usuaria');
      expect(side).toContain('desde');
      expect(side).toContain('SN-123');
      expect(side).toContain('Piso 2');
    });

    it('says "Sin asignar" and shows dashes for what is missing', async () => {
      await setup(assetDetail({ serialNumber: null, location: null }));
      const side = (el().querySelector('.side')?.textContent ?? '').replace(/\s+/g, ' ');
      expect(side).toContain('Sin asignar');
      expect((side.match(/—/g) ?? []).length).toBe(2);
    });

    it('shows the assignment history, with the current holder marked', async () => {
      await setup();
      expect(text()).toContain('Historial de asignaciones 1');
      expect(el().querySelector('app-assignment-timeline')?.textContent).toContain('Actual');
      expect(text()).toContain('Para el trabajo remoto');
    });

    it('lists the related tickets with a link, status and priority', async () => {
      await setup(assetDetail(), [ticket()]);
      const row = el().querySelector('.ticket')!;
      expect(row.querySelector('a')?.getAttribute('href')).toBe('/tickets/t-1');
      expect(row.textContent).toContain('TCK-000142');
      expect(row.textContent).toContain('En curso');
      expect(row.textContent).toContain('Alta');
      expect(text()).toContain('Tickets relacionados 1');
    });

    it('says when no ticket mentions it, and warns when the list is capped at 25', async () => {
      await setup(assetDetail(), []);
      expect(text()).toContain('Ningún ticket menciona este equipo.');

      TestBed.resetTestingModule();
      await setup(
        assetDetail(),
        Array.from({ length: 25 }, (_, i) => ticket({ id: `t-${i}`, ticketCode: `TCK-${i}` })),
      );
      expect(text()).toContain('Se muestran los 25 más recientes.');
    });

    it('puts the equipment in the title of the browser tab', async () => {
      await setup();
      expect(TestBed.inject(Title).getTitle()).toBe('AST-000045 · SupportHub');
    });

    it('offers to create a ticket with this equipment already chosen', async () => {
      await setup();
      const link = Array.from(el().querySelectorAll<HTMLAnchorElement>('a')).find(
        (a) => a.textContent?.trim() === 'Crear ticket',
      )!;
      expect(link.getAttribute('href')).toBe('/tickets/nuevo?equipo=a-1');
    });
  });

  describe('the actions follow what the server offers', () => {
    it('an available equipment: assign, change status and edit', async () => {
      await setup(assetDetail());
      expect(button('Asignar')).toBeTruthy();
      expect(button('Cambiar estado')).toBeTruthy();
      expect(button('Editar')).toBeTruthy();
      expect(button('Transferir')).toBeUndefined();
      expect(button('Registrar devolución')).toBeUndefined();
    });

    it('an assigned equipment: transfer and return, but no assign and no status change', async () => {
      await setup(assignedAsset());
      expect(button('Transferir')).toBeTruthy();
      expect(button('Registrar devolución')).toBeTruthy();
      expect(button('Asignar')).toBeUndefined();
      expect(button('Cambiar estado')).toBeUndefined();
    });

    it('someone who only reads sees no buttons, just the link to create a ticket', async () => {
      await setup(
        assetDetail({
          actions: {
            edit: false,
            assign: false,
            transfer: false,
            returnAsset: false,
            changeStatus: [],
          },
        }),
      );
      expect(el().querySelectorAll('.head__actions button')).toHaveLength(0);
      expect(text()).toContain('Crear ticket');
    });

    it('a retired equipment can no longer be edited or changed', async () => {
      await setup(
        assetDetail({
          status: 'RETIRED',
          actions: {
            edit: false,
            assign: false,
            transfer: false,
            returnAsset: false,
            changeStatus: [],
          },
        }),
      );
      expect(button('Editar')).toBeUndefined();
      expect(button('Cambiar estado')).toBeUndefined();
    });

    it.each([
      ['Asignar', AssetAssignDialog, 'assign', assetDetail()],
      ['Transferir', AssetAssignDialog, 'transfer', assignedAsset()],
      ['Cambiar estado', AssetStatusDialog, undefined, assetDetail()],
      ['Editar', AssetFormDialog, undefined, assetDetail()],
    ] as const)(
      '"%s" opens its dialog with the equipment, and reloads when the dialog says so',
      async (label, component, mode, asset) => {
        await setup(asset);
        const open = vi
          .spyOn(TestBed.inject(DialogService), 'open')
          .mockReturnValue({ closed: of(true) } as never);

        button(label)!.click();
        await settle();

        const data = mode
          ? { asset: expect.objectContaining({ id: 'a-1' }), mode }
          : { asset: expect.objectContaining({ id: 'a-1' }) };
        expect(open).toHaveBeenCalledWith(component, expect.objectContaining({ data }));
        http.expectOne(A).flush(asset);
        http.expectOne(`${A}/assignments`).flush(assignments);
      },
    );

    it('does not reload when the dialog is cancelled', async () => {
      await setup(assetDetail());
      vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({
        closed: of(false),
      } as never);

      button('Asignar')!.click();
      await settle();
      http.expectNone(A);
    });
  });

  describe('returning an equipment', () => {
    it('asks first, naming who returns it, and does nothing when the person cancels', async () => {
      await setup(assignedAsset());
      const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(false);

      button('Registrar devolución')!.click();
      await settle();

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Registrar devolución',
          message: expect.stringContaining('Lucía Usuaria'),
        }),
      );
      http.expectNone(`${A}/return`);
    });

    it('registers it, says so and reloads the equipment and its history', async () => {
      await setup(assignedAsset());
      vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(true);

      button('Registrar devolución')!.click();
      await settle();
      const request = http.expectOne(`${A}/return`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({});
      request.flush(assetDetail());
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Registraste la devolución del equipo AST-000045.',
      );
      http.expectOne(A).flush(assetDetail());
      http.expectOne(`${A}/assignments`).flush(assignments);
      await settle();
      expect(button('Asignar')).toBeTruthy();
    });

    it('explains it, and still refreshes, when it had already been returned', async () => {
      await setup(assignedAsset());
      vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(true);

      button('Registrar devolución')!.click();
      await settle();
      http
        .expectOne(`${A}/return`)
        .flush(apiError(409, 'ASSET_NOT_ASSIGNED'), { status: 409, statusText: 'Conflict' });
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Este equipo no está asignado a nadie.',
      );
      http.expectOne(A).flush(assetDetail());
      http.expectOne(`${A}/assignments`).flush(assignments);
    });
  });

  describe('when things go wrong', () => {
    it('says the equipment was not found on a 404', async () => {
      create();
      await settle();
      http
        .expectOne(A)
        .flush(apiError(404, 'RESOURCE_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
      http
        .expectOne(`${A}/assignments`)
        .flush(apiError(404, 'RESOURCE_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
      http
        .expectOne(`${A}/tickets`)
        .flush(apiError(404, 'RESOURCE_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
      await settle();

      expect(text()).toContain('No encontramos este equipo');
      expect(el().querySelector('h1')).toBeNull();
    });

    it('shows an error with a retry for other failures, and the retry reloads everything', async () => {
      create();
      await settle();
      http
        .expectOne(A)
        .flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
      http.expectOne(`${A}/assignments`).flush(assignments);
      http.expectOne(`${A}/tickets`).flush([]);
      await settle();
      expect(text()).toContain('No pudimos cargar el equipo');

      Array.from(el().querySelectorAll('button'))
        .find((b) => b.textContent?.trim() === 'Reintentar')!
        .click();
      await settle();
      http.expectOne(A).flush(assetDetail());
      http.expectOne(`${A}/assignments`).flush(assignments);
      http.expectOne(`${A}/tickets`).flush([]);
      await settle();
      expect(el().querySelector('h1')?.textContent).toBe('Dell Latitude 5440');
    });

    it('keeps the page usable when only the history fails', async () => {
      create();
      await settle();
      http.expectOne(A).flush(assetDetail());
      http
        .expectOne(`${A}/assignments`)
        .flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
      http.expectOne(`${A}/tickets`).flush([]);
      await settle();

      expect(el().querySelector('h1')?.textContent).toBe('Dell Latitude 5440');
      expect(text()).toContain('No pudimos cargar el historial');
    });

    it('never shows the data of the previous equipment under the new address', async () => {
      await setup();
      fixture.componentRef.setInput('id', 'a-2');
      await settle();

      expect(el().querySelector('h1')).toBeNull();
      expect(el().querySelector('[aria-label="Cargando el equipo"]')).not.toBeNull();

      http
        .expectOne('/api/v1/assets/a-2')
        .flush(assetDetail({ id: 'a-2', assetTag: 'AST-000050', brand: 'HP', model: 'EliteBook' }));
      http.expectOne('/api/v1/assets/a-2/assignments').flush([]);
      http.expectOne('/api/v1/assets/a-2/tickets').flush([]);
      await settle();
      expect(el().querySelector('h1')?.textContent).toBe('HP EliteBook');
    });
  });
});
