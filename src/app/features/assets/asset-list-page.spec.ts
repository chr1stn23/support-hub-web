import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import type { AssetListItem, DashboardSummary, PageResponse } from '@core/api/models';
import { AssetListPage } from './asset-list-page';

const TYPE = '0c9d6e0e-7b1d-4c0a-9f0e-3a6f5f0c1b11';

const asset = (overrides: Partial<AssetListItem> = {}): AssetListItem => ({
  id: 'a-1',
  assetTag: 'AST-000045',
  type: 'Laptop',
  brand: 'Dell',
  model: 'Latitude 5440',
  status: 'ASSIGNED',
  location: 'Piso 2',
  assignedTo: { id: 'u-9', fullName: 'Lucía Usuaria' },
  ...overrides,
});

const pageOf = (
  content: AssetListItem[],
  totalElements = content.length,
): PageResponse<AssetListItem> => ({
  content,
  page: 0,
  size: 20,
  totalElements,
  totalPages: Math.max(1, Math.ceil(totalElements / 20)),
});

const summary: DashboardSummary = {
  scope: 'ALL',
  tickets: {
    open: 0,
    unassigned: 0,
    highPriorityOpen: 0,
    byStatus: { OPEN: 0, IN_PROGRESS: 0, WAITING: 0, RESOLVED: 0, CLOSED: 0, CANCELLED: 0 },
  },
  mine: null,
  assets: {
    total: 40,
    byStatus: { AVAILABLE: 12, ASSIGNED: 20, MAINTENANCE: 5, RETIRED: 3 },
    byType: [],
  },
};

describe('AssetListPage', () => {
  let fixture: ComponentFixture<AssetListPage>;
  let http: HttpTestingController;
  let router: Router;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const assets = () => http.expectOne((r) => r.url === '/api/v1/assets');

  /** Deja correr los efectos y las promesas pendientes. */
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup(params: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(AssetListPage);
    for (const [name, value] of Object.entries(params)) {
      fixture.componentRef.setInput(name, value);
    }
    await settle();
  }

  async function loadWith(page: PageResponse<AssetListItem>) {
    assets().flush(page);
    http.expectOne('/api/v1/asset-types').flush([{ id: TYPE, name: 'Laptop' }]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
    await settle();
  }

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    vi.useRealTimers();
  });

  it('asks for every equipment sorted by tag, and shows each row', async () => {
    await setup();
    const request = assets();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('sort')).toBe('assetTag,asc');
    expect(request.request.params.has('status')).toBe(false);
    request.flush(pageOf([asset()]));
    http.expectOne('/api/v1/asset-types').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
    await settle();

    expect(text()).toContain('AST-000045');
    expect(text()).toContain('Laptop');
    expect(text()).toContain('Dell');
    expect(text()).toContain('Latitude 5440');
    expect(text()).toContain('Asignado');
    expect(text()).toContain('Lucía Usuaria');
    expect(text()).toContain('Piso 2');
  });

  it('links each tag to the detail of the equipment', async () => {
    await setup();
    await loadWith(pageOf([asset({ id: 'a-7' })]));
    expect(el().querySelector('td.cell-code a')?.getAttribute('href')).toBe('/activos/a-7');
  });

  it('shows "—" for what is not there: no brand, no model, no holder, no location', async () => {
    await setup();
    await loadWith(
      pageOf([
        asset({ brand: null, model: null, assignedTo: null, location: null, status: 'RETIRED' }),
      ]),
    );

    const cells = Array.from(el().querySelectorAll('tbody td')).map((td) => td.textContent?.trim());
    expect(cells.filter((cell) => cell === '—')).toHaveLength(4);
  });

  it('shows the counters of the tabs, and marks the active one', async () => {
    await setup();
    await loadWith(pageOf([asset()]));

    const tabs = Array.from(el().querySelectorAll('.link-tab')).map((a) =>
      (a.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );
    expect(tabs).toEqual([
      'Todos 40',
      'Disponibles 12',
      'Asignados 20',
      'En mantenimiento 5',
      'De baja 3',
    ]);
    expect(el().querySelector('.link-tab.is-active')?.getAttribute('aria-current')).toBe('page');
  });

  it('turns the tab of the URL into the status the backend filters by', async () => {
    await setup({ estado: 'disponibles' });
    const request = assets();

    expect(request.request.params.get('status')).toBe('AVAILABLE');
    request.flush(pageOf([]));
    http.expectOne('/api/v1/asset-types').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
    await settle();
    expect(el().querySelector('.link-tab.is-active')?.textContent).toContain('Disponibles');
  });

  it('passes the search, the type, the page and the sort of the URL (the page counts from 1 there)', async () => {
    await setup({ buscar: 'dell', tipo: TYPE, pagina: '3', orden: 'brand,desc', tamano: '50' });
    const request = assets();

    expect(request.request.params.get('search')).toBe('dell');
    expect(request.request.params.get('assetTypeId')).toBe(TYPE);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('50');
    expect(request.request.params.get('sort')).toBe('brand,desc');
    request.flush(pageOf([]));
    http.expectOne('/api/v1/asset-types').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
  });

  it('ignores nonsense in the URL instead of failing', async () => {
    await setup({
      pagina: 'abc',
      tamano: '999',
      orden: 'serialNumber,asc',
      estado: 'inventado',
      tipo: 'hola',
    });
    const request = assets();

    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('sort')).toBe('assetTag,asc');
    expect(request.request.params.has('status')).toBe(false);
    expect(request.request.params.has('assetTypeId')).toBe(false);
    request.flush(pageOf([]));
    http.expectOne('/api/v1/asset-types').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
  });

  it('sorts by clicking a header, going back to the first page', async () => {
    await setup({ pagina: '2' });
    await loadWith(pageOf([asset()], 60));

    const header = Array.from(el().querySelectorAll('th')).find((th) =>
      th.textContent?.includes('Marca'),
    )!;
    header.querySelector('button')!.click();

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { orden: 'brand,asc' } }),
    );
  });

  it('only offers to sort by the columns the backend can sort by', async () => {
    await setup();
    await loadWith(pageOf([asset()]));

    const sortable = Array.from(el().querySelectorAll('th'))
      .filter((th) => th.querySelector('button'))
      .map((th) => th.textContent?.trim());
    expect(sortable).toEqual(['Etiqueta', 'Marca', 'Modelo']);
  });

  it('changes page (the URL counts from 1)', async () => {
    await setup();
    await loadWith(pageOf([asset()], 60));

    el().querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { pagina: '2' } }),
    );
  });

  it('filters by type, going back to the first page', async () => {
    await setup({ pagina: '2' });
    await loadWith(pageOf([asset()], 60));

    const select = el().querySelector<HTMLSelectElement>('select[aria-label="Filtrar por tipo"]')!;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual([
      'Todos los tipos',
      'Laptop',
    ]);
    select.value = TYPE;
    select.dispatchEvent(new Event('change'));

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { tipo: TYPE } }),
    );
  });

  it('waits for the person to stop typing before searching', async () => {
    await setup();
    await loadWith(pageOf([asset()]));

    vi.useFakeTimers();

    const input = el().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'del';
    input.dispatchEvent(new Event('input'));
    input.value = 'dell';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(200);
    expect(router.navigate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(150);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { buscar: 'dell' } }),
    );
  });

  it('tells apart "nothing here" from "nothing matches your search"', async () => {
    await setup();
    await loadWith(pageOf([]));
    expect(text()).toContain('No hay equipos en esta vista');

    TestBed.resetTestingModule();
    await setup({ buscar: 'xyz' });
    await loadWith(pageOf([]));
    expect(text()).toContain('Ningún equipo coincide con tu búsqueda');
    expect(text()).toContain('Limpiar filtros');
  });

  it('clears the filters, keeping the tab', async () => {
    await setup({ estado: 'asignados', buscar: 'xyz', tipo: TYPE });
    await loadWith(pageOf([]));

    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Limpiar filtros'))!
      .click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { estado: 'asignados' } }),
    );
  });

  it('shows the error with a retry that reloads the list and the counters', async () => {
    await setup();
    assets().flush(
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
    http.expectOne('/api/v1/asset-types').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
    await settle();

    expect(text()).toContain('No pudimos cargar los equipos');
    expect(text()).not.toContain('detalle');

    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Reintentar')!
      .click();
    await settle();
    assets().flush(pageOf([asset()]));
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
    await settle();
    expect(text()).toContain('AST-000045');
  });

  it('shows the counters only when the summary has them', async () => {
    await setup();
    assets().flush(pageOf([asset()]));
    http.expectOne('/api/v1/asset-types').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush({ ...summary, assets: null });
    await settle();

    expect(el().querySelector('.link-tab__count')).toBeNull();
    expect(text()).toContain('Todos');
  });

  it('shows a skeleton while the first page loads', async () => {
    await setup();
    expect(el().querySelector('[aria-label="Cargando equipos"]')).not.toBeNull();
    assets().flush(pageOf([]));
    http.expectOne('/api/v1/asset-types').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
  });
});
