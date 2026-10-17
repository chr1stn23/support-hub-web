import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { AssetListItem } from '@core/api/models';
import { MyAssetsPage } from './my-assets-page';

const URL = '/api/v1/assets/mine';

const asset = (overrides: Partial<AssetListItem> = {}): AssetListItem => ({
  id: 'a-1',
  assetTag: 'AST-000045',
  type: 'Laptop',
  brand: 'Dell',
  model: 'Latitude 5440',
  status: 'ASSIGNED',
  location: 'Piso 2',
  assignedTo: { id: 'u-1', fullName: 'Lucía Usuaria' },
  ...overrides,
});

describe('MyAssetsPage', () => {
  let fixture: ComponentFixture<MyAssetsPage>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MyAssetsPage);
    await settle();
  }

  async function loadWith(items: AssetListItem[]) {
    http.expectOne(URL).flush(items);
    await settle();
  }

  afterEach(() => http.verify({ ignoreCancelled: true }));

  it('shows a card per equipment, with its kind, status, tag and location', async () => {
    await setup();
    await loadWith([asset()]);

    expect(el().querySelectorAll('.card')).toHaveLength(1);
    expect(el().querySelector('.card__title')?.textContent).toBe('Dell Latitude 5440');
    expect(text()).toContain('Laptop');
    expect(text()).toContain('Asignado');
    expect(text()).toContain('AST-000045');
    expect(text()).toContain('Piso 2');
  });

  it('counts them in the description, in singular and plural', async () => {
    await setup();
    await loadWith([asset()]);
    expect(text()).toContain('Tienes 1 equipo asignado.');

    TestBed.resetTestingModule();
    await setup();
    await loadWith([asset(), asset({ id: 'a-2', assetTag: 'AST-000046' })]);
    expect(text()).toContain('Tienes 2 equipos asignados.');
  });

  it('falls back to the kind when brand and model are missing, and shows "—" for an unknown location', async () => {
    await setup();
    await loadWith([asset({ brand: null, model: null, location: null })]);

    expect(el().querySelector('.card__title')?.textContent).toBe('Laptop');
    expect(el().querySelector('.facts')?.textContent).toContain('—');
  });

  it('offers to report a problem with that equipment: the new ticket opens with it already chosen', async () => {
    await setup();
    await loadWith([asset({ id: 'a-7' })]);

    const link = Array.from(el().querySelectorAll<HTMLAnchorElement>('a')).find(
      (a) => a.textContent?.trim() === 'Reportar un problema',
    )!;
    expect(link.getAttribute('href')).toBe('/tickets/nuevo?equipo=a-7');
  });

  it('shows the brand and model as plain text, never as HTML', async () => {
    await setup();
    await loadWith([asset({ brand: '<img src=x onerror=alert(1)>', model: '<b>X</b>' })]);

    expect(el().querySelector('.card img')).toBeNull();
    expect(el().querySelector('.card b')).toBeNull();
    expect(el().querySelector('.card__title')?.textContent).toBe(
      '<img src=x onerror=alert(1)> <b>X</b>',
    );
  });

  it('says there are none, and offers to ask for one', async () => {
    await setup();
    await loadWith([]);

    expect(text()).toContain('No tienes equipos asignados');
    expect(text()).toContain('Aquí verás los equipos que tengas asignados.');
    const cta = Array.from(el().querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
      a.textContent?.includes('Crear un ticket'),
    )!;
    expect(cta.getAttribute('href')).toBe('/tickets/nuevo');
  });

  it('shows a skeleton while it loads', async () => {
    await setup();
    expect(el().querySelector('[aria-label="Cargando tus equipos"]')).not.toBeNull();
    await loadWith([]);
  });

  it('shows the error with a retry that reloads', async () => {
    await setup();
    http.expectOne(URL).flush(
      {
        timestamp: '',
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'detalle interno',
        path: '',
        fieldErrors: [],
      },
      { status: 500, statusText: 'Error' },
    );
    await settle();

    expect(text()).toContain('No pudimos cargar tus equipos');
    expect(text()).toContain('Algo salió mal de nuestro lado');
    expect(text()).not.toContain('detalle interno');

    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Reintentar')!
      .click();
    await settle();
    await loadWith([asset()]);
    expect(text()).toContain('Dell Latitude 5440');
  });
});
