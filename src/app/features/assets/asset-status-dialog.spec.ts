import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { AssetDetail } from '@core/api/models';
import { ToastService } from '@shared/ui';
import { AssetStatusDialog } from './asset-status-dialog';
import { apiError, assetDetail } from './asset-fixtures';

const URL = '/api/v1/assets/a-1/status';

describe('AssetStatusDialog', () => {
  let fixture: ComponentFixture<AssetStatusDialog>;
  let http: HttpTestingController;
  let close: ReturnType<typeof vi.fn>;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const radios = () => Array.from(el().querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  const confirm = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const settle = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  function setup(asset: AssetDetail) {
    close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DIALOG_DATA, useValue: { asset } },
        { provide: DialogRef, useValue: { close } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssetStatusDialog);
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

  it('offers exactly the states the server allows, explained in Spanish', () => {
    setup(assetDetail()); // MAINTENANCE y RETIRED
    expect(radios()).toHaveLength(2);
    expect(text()).toContain('Enviar a mantenimiento');
    expect(text()).toContain('Dar de baja');
    expect(text()).not.toContain('Marcar como disponible');
  });

  it('preselects the option when there is only one', () => {
    setup(
      assetDetail({
        status: 'MAINTENANCE',
        actions: { ...assetDetail().actions, changeStatus: ['AVAILABLE'] },
      }),
    );
    expect(radios()).toHaveLength(1);
    expect(radios()[0].checked).toBe(true);
  });

  it('asks the person to choose when there are several', () => {
    setup(assetDetail());
    submit();
    expect(text()).toContain('Selecciona el nuevo estado.');
    http.expectNone(URL);
  });

  it('warns that retiring is final, and colours the confirmation red only then', () => {
    setup(assetDetail());
    pick(0);
    expect(confirm().classList).toContain('btn--primary');

    pick(1);
    expect(text()).toContain('Es definitivo');
    expect(confirm().classList).toContain('btn--danger');
  });

  it('sends the status, thanks the person and asks for a reload', async () => {
    setup(assetDetail());
    pick(0);
    submit();

    const request = http.expectOne(URL);
    expect(request.request.body).toEqual({ status: 'MAINTENANCE' });
    request.flush(assetDetail({ status: 'MAINTENANCE' }));
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'El equipo AST-000045 ahora está «En mantenimiento».',
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('ignores a second submit while the first is in flight', () => {
    setup(assetDetail());
    pick(0);
    submit();
    submit();
    http.expectOne(URL); // expectOne falla si hubiera dos peticiones
  });

  it('when the equipment changed meanwhile, explains it, closes and asks for a reload', async () => {
    setup(assetDetail());
    pick(0);
    submit();
    http.expectOne(URL).flush(apiError(409, 'INVALID_ASSET_STATUS_TRANSITION'), {
      status: 409,
      statusText: 'Conflict',
    });
    await settle();

    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      'Ese cambio de estado no es válido para este equipo.',
    );
    expect(close).toHaveBeenCalledWith(true);
  });

  it('stays open, with the message, for any other failure', async () => {
    setup(assetDetail());
    pick(0);
    submit();
    http
      .expectOne(URL)
      .flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
    await settle();

    expect(el().querySelector('.callout')?.textContent).toContain('Algo salió mal de nuestro lado');
    expect(close).not.toHaveBeenCalled();
  });
});
