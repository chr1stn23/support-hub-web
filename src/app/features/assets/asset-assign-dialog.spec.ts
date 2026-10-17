import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { AssetDetail } from '@core/api/models';
import { ToastService } from '@shared/ui';
import { AssetAssignDialog } from './asset-assign-dialog';
import { apiError, assetDetail, assignedAsset, lookupPage, person } from './asset-fixtures';

const LOOKUP = (r: { url: string }) => r.url === '/api/v1/users/lookup';

describe('AssetAssignDialog', () => {
  let fixture: ComponentFixture<AssetAssignDialog>;
  let http: HttpTestingController;
  let close: ReturnType<typeof vi.fn>;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const radios = () => Array.from(el().querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup(asset: AssetDetail, mode: 'assign' | 'transfer') {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: { asset, mode } },
        { provide: DialogRef, useValue: { close } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssetAssignDialog);
    await settle();
    http
      .expectOne(LOOKUP)
      .flush(
        lookupPage(
          person('u-1', 'Ana Admin'),
          person('u-2', 'Elena Agente'),
          person('u-9', 'Lucía Usuaria'),
        ),
      );
    await settle();
  }

  function choose(id: string): void {
    radios()
      .find((radio) => radio.value === id)!
      .click();
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

  describe('assign', () => {
    it('offers everybody, with no hint about a current holder', async () => {
      await setup(assetDetail(), 'assign');
      expect(text()).toContain('Asignar equipo');
      expect(radios()).toHaveLength(3);
      expect(text()).not.toContain('Ahora lo tiene');
    });

    it('asks the person to choose before sending', async () => {
      await setup(assetDetail(), 'assign');
      submit();

      expect(text()).toContain('Selecciona a quién asignarlo.');
      http.expectNone('/api/v1/assets/a-1/assign');
    });

    it('assigns with the trimmed note, thanks the person and asks for a reload', async () => {
      await setup(assetDetail(), 'assign');
      choose('u-2');
      const note = el().querySelector<HTMLTextAreaElement>('textarea')!;
      note.value = '  Para el trabajo remoto  ';
      note.dispatchEvent(new Event('input'));
      submit();

      const request = http.expectOne('/api/v1/assets/a-1/assign');
      expect(request.request.body).toEqual({ userId: 'u-2', notes: 'Para el trabajo remoto' });
      request.flush(assignedAsset());
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Asignaste el equipo AST-000045 a Elena Agente.',
      );
      expect(close).toHaveBeenCalledWith(true);
    });

    it('sends no note when it is left empty', async () => {
      await setup(assetDetail(), 'assign');
      choose('u-1');
      submit();
      expect(http.expectOne('/api/v1/assets/a-1/assign').request.body).toEqual({
        userId: 'u-1',
        notes: null,
      });
    });

    it('refuses a note that is too long', async () => {
      await setup(assetDetail(), 'assign');
      choose('u-1');
      const note = el().querySelector<HTMLTextAreaElement>('textarea')!;
      note.value = 'x'.repeat(501);
      note.dispatchEvent(new Event('input'));
      submit();

      expect(text()).toContain('La nota no puede superar los 500 caracteres.');
      http.expectNone('/api/v1/assets/a-1/assign');
    });

    it('ignores a second submit while the first is in flight', async () => {
      await setup(assetDetail(), 'assign');
      choose('u-1');
      submit();
      submit();
      http.expectOne('/api/v1/assets/a-1/assign'); // expectOne falla si hubiera dos peticiones
    });

    it('stays open when the chosen person cannot receive it, and asks to choose again', async () => {
      await setup(assetDetail(), 'assign');
      choose('u-2');
      submit();
      http
        .expectOne('/api/v1/assets/a-1/assign')
        .flush(apiError(400, 'INVALID_ASSIGNEE'), { status: 400, statusText: 'Bad Request' });
      await settle();

      expect(el().querySelector('.callout')?.textContent).toContain('La persona elegida no existe');
      expect(radios().every((radio) => !radio.checked)).toBe(true);
      expect(close).not.toHaveBeenCalled();
    });

    it('when someone assigned it first, explains it, closes and asks for a reload', async () => {
      await setup(assetDetail(), 'assign');
      choose('u-2');
      submit();
      http
        .expectOne('/api/v1/assets/a-1/assign')
        .flush(apiError(409, 'ASSET_ALREADY_ASSIGNED'), { status: 409, statusText: 'Conflict' });
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Este equipo ya está asignado. Actualiza la lista para ver quién lo tiene.',
      );
      expect(close).toHaveBeenCalledWith(true);
    });
  });

  describe('transfer', () => {
    it('says who has it now, and does not offer them as a destination', async () => {
      await setup(assignedAsset(), 'transfer');

      expect(text()).toContain('Transferir equipo');
      expect(text()).toContain('Ahora lo tiene Lucía Usuaria.');
      expect(radios().map((radio) => radio.value)).toEqual(['u-1', 'u-2']);
    });

    it('transfers to the chosen person through its own endpoint', async () => {
      await setup(assignedAsset(), 'transfer');
      choose('u-1');
      submit();

      const request = http.expectOne('/api/v1/assets/a-1/transfer');
      expect(request.request.body).toEqual({ userId: 'u-1', notes: null });
      request.flush(assignedAsset());
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Transferiste el equipo AST-000045 a Ana Admin.',
      );
      expect(close).toHaveBeenCalledWith(true);
    });

    it('asks to choose, with the wording of a transfer', async () => {
      await setup(assignedAsset(), 'transfer');
      submit();
      expect(text()).toContain('Selecciona a quién transferirlo.');
    });

    it('when the equipment was returned meanwhile, explains it and asks for a reload', async () => {
      await setup(assignedAsset(), 'transfer');
      choose('u-1');
      submit();
      http
        .expectOne('/api/v1/assets/a-1/transfer')
        .flush(apiError(409, 'ASSET_NOT_ASSIGNED'), { status: 409, statusText: 'Conflict' });
      await settle();

      expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
        'Este equipo no está asignado a nadie.',
      );
      expect(close).toHaveBeenCalledWith(true);
    });
  });
});
