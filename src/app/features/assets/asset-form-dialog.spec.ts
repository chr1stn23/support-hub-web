import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { AssetDetail } from '@core/api/models';
import { ToastService } from '@shared/ui';
import { AssetFormDialog } from './asset-form-dialog';
import { apiError, assetDetail } from './asset-fixtures';

const URL = '/api/v1/assets';
const TYPES = [
  { id: 'type-1', name: 'Laptop' },
  { id: 'type-2', name: 'Monitor' },
];

describe('AssetFormDialog', () => {
  let fixture: ComponentFixture<AssetFormDialog>;
  let http: HttpTestingController;
  let close: ReturnType<typeof vi.fn>;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const save = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const field = (label: string) => {
    const wrapper = Array.from(el().querySelectorAll('app-field')).find((f) =>
      f.querySelector('label')?.textContent?.includes(label),
    );
    return wrapper!.querySelector<HTMLInputElement | HTMLSelectElement>('input, select')!;
  };
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup(asset?: AssetDetail, types = TYPES) {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: asset ? { asset } : {} },
        { provide: DialogRef, useValue: { close } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssetFormDialog);
    await settle();
    http.expectOne('/api/v1/asset-types').flush(types);
    await settle();
  }

  function fill(label: string, value: string, kind: 'input' | 'change' = 'input'): void {
    const control = field(label);
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
    http.verify({ ignoreCancelled: true });
    TestBed.inject(ToastService).clear();
  });

  describe('registering', () => {
    it('starts empty, with the types to choose from', async () => {
      await setup();
      expect(text()).toContain('Nuevo equipo');
      expect(
        Array.from(field('Tipo').querySelectorAll('option')).map((o) => o.textContent?.trim()),
      ).toEqual(['Selecciona un tipo', 'Laptop', 'Monitor']);
      expect(save().textContent?.trim()).toBe('Registrar equipo');
      expect(save().hasAttribute('disabled')).toBe(false);
    });

    it('does not scold the person before they try to send', async () => {
      await setup();
      expect(text()).not.toContain('Escribe la marca.');
    });

    it('refuses an empty form and does not call the server', async () => {
      await setup();
      submit();

      expect(text()).toContain('Selecciona un tipo.');
      expect(text()).toContain('Escribe la marca.');
      expect(text()).toContain('Escribe el modelo.');
      expect(field('Marca').getAttribute('aria-invalid')).toBe('true');
      http.expectNone(URL);
    });

    it('treats a brand or model made of spaces as empty', async () => {
      await setup();
      fill('Tipo', 'type-1', 'change');
      fill('Marca', '     ');
      fill('Modelo', '     ');
      submit();

      expect(text()).toContain('Escribe la marca.');
      expect(text()).toContain('Escribe el modelo.');
      http.expectNone(URL);
    });

    it('refuses texts that are too long', async () => {
      await setup();
      fill('Tipo', 'type-1', 'change');
      fill('Marca', 'x'.repeat(81));
      fill('Modelo', 'ok');
      submit();

      expect(text()).toContain('La marca no puede superar los 80 caracteres.');
      http.expectNone(URL);
    });

    it('sends the trimmed data, with null for what was left empty, and opens the new equipment', async () => {
      await setup();
      fill('Tipo', 'type-2', 'change');
      fill('Marca', '  Samsung ');
      fill('Modelo', ' Odyssey G5 ');
      submit();

      const request = http.expectOne(URL);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        assetTypeId: 'type-2',
        brand: 'Samsung',
        model: 'Odyssey G5',
        serialNumber: null,
        location: null,
      });
      request.flush(assetDetail({ id: 'a-99', assetTag: 'AST-000099' }), {
        status: 201,
        statusText: 'Created',
      });
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Registraste el equipo AST-000099.',
      );
      expect(close).toHaveBeenCalledWith('a-99');
    });

    it('ignores a second submit while the first is in flight', async () => {
      await setup();
      fill('Tipo', 'type-1', 'change');
      fill('Marca', 'Dell');
      fill('Modelo', 'XPS');
      submit();
      submit();
      http.expectOne(URL); // expectOne falla si hubiera dos peticiones
    });

    it('puts the duplicate-serial error next to the serial field, and stays open', async () => {
      await setup();
      fill('Tipo', 'type-1', 'change');
      fill('Marca', 'Dell');
      fill('Modelo', 'XPS');
      fill('Número de serie', 'SN-123');
      submit();
      http
        .expectOne(URL)
        .flush(apiError(409, 'DUPLICATE_SERIAL_NUMBER'), { status: 409, statusText: 'Conflict' });
      await settle();

      expect(text()).toContain('Ya existe otro equipo con ese número de serie.');
      expect(field('Número de serie').getAttribute('aria-invalid')).toBe('true');
      expect(close).not.toHaveBeenCalled();

      fill('Número de serie', 'SN-124'); // al corregirlo, el aviso desaparece
      expect(text()).not.toContain('Ya existe otro equipo con ese número de serie.');
    });

    it('shows a general error for any other failure, keeping what was typed', async () => {
      await setup();
      fill('Tipo', 'type-1', 'change');
      fill('Marca', 'Dell');
      fill('Modelo', 'XPS');
      submit();
      http
        .expectOne(URL)
        .flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
      await settle();

      expect(el().querySelector('.callout--error')?.textContent).toContain(
        'Algo salió mal de nuestro lado',
      );
      expect((field('Marca') as HTMLInputElement).value).toBe('Dell');
    });
  });

  describe('editing', () => {
    it('starts with the current values and "Guardar" disabled until something changes', async () => {
      await setup(assetDetail());
      expect(text()).toContain('Editar equipo');
      expect((field('Marca') as HTMLInputElement).value).toBe('Dell');
      expect((field('Número de serie') as HTMLInputElement).value).toBe('SN-123');
      expect((field('Tipo') as HTMLSelectElement).value).toBe('type-1');
      expect(save().hasAttribute('disabled')).toBe(true);

      fill('Ubicación', 'Almacén');
      expect(save().hasAttribute('disabled')).toBe(false);
    });

    it('shows the current type even if it is no longer in the list', async () => {
      await setup(assetDetail({ type: { id: 'type-old', name: 'Fax' } }), []);
      expect(
        Array.from(field('Tipo').querySelectorAll('option')).map((o) => o.textContent?.trim()),
      ).toEqual(['Fax']);
    });

    it('sends only what changed, with the version that was read', async () => {
      await setup(assetDetail());
      fill('Marca', '  Lenovo ');
      submit();

      const request = http.expectOne(`${URL}/a-1`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ version: 4, brand: 'Lenovo' });
      request.flush(assetDetail());
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Guardaste los cambios del equipo.',
      );
      expect(close).toHaveBeenCalledWith(true);
    });

    it('sends an empty string when the serial number is erased, which is how the backend clears it', async () => {
      await setup(assetDetail());
      fill('Número de serie', '');
      submit();

      expect(http.expectOne(`${URL}/a-1`).request.body).toEqual({ version: 4, serialNumber: '' });
    });

    it('validates before sending', async () => {
      await setup(assetDetail());
      fill('Marca', '   ');
      submit();

      expect(text()).toContain('Escribe la marca.');
      http.expectNone(`${URL}/a-1`);
    });

    describe('when someone else edited it meanwhile', () => {
      async function conflict() {
        await setup(assetDetail());
        fill('Marca', 'Mi marca');
        submit();
        http
          .expectOne(`${URL}/a-1`)
          .flush(apiError(409, 'CONCURRENT_MODIFICATION'), { status: 409, statusText: 'Conflict' });
        await settle();
        http.expectOne(`${URL}/a-1`).flush(assetDetail({ version: 5, location: 'Bodega norte' })); // la versión actual
        await settle();
      }

      it('explains it, keeps what the person changed and brings in the rest', async () => {
        await conflict();
        expect(text()).toContain('Alguien más modificó este equipo mientras lo editabas');
        expect((field('Marca') as HTMLInputElement).value).toBe('Mi marca');
        expect((field('Ubicación') as HTMLInputElement).value).toBe('Bodega norte');
        expect(close).not.toHaveBeenCalled();
      });

      it("saves again with the new version, sending only the person's own change", async () => {
        await conflict();
        submit();

        const request = http.expectOne(`${URL}/a-1`);
        expect(request.request.body).toEqual({ version: 5, brand: 'Mi marca' });
        request.flush(assetDetail({ version: 6 }));
        await settle();
        expect(close).toHaveBeenCalledWith(true);
      });
    });

    it('closes and asks for a reload when the equipment was retired meanwhile', async () => {
      await setup(assetDetail());
      fill('Marca', 'Tarde');
      submit();
      http
        .expectOne(`${URL}/a-1`)
        .flush(apiError(409, 'ASSET_RETIRED'), { status: 409, statusText: 'Conflict' });
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Este equipo está dado de baja y ya no se puede modificar.',
      );
      expect(close).toHaveBeenCalledWith(true);
    });
  });
});
