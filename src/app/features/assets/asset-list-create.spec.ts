import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import type { Role } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { DialogService } from '@shared/ui';
import { AssetFormDialog } from './asset-form-dialog';
import { AssetListPage } from './asset-list-page';

const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 1 };
const summary = {
  scope: 'ALL',
  tickets: { open: 0, unassigned: 0, highPriorityOpen: 0, byStatus: {} },
  mine: null,
  assets: { total: 0, byStatus: {}, byType: [] },
};

describe('AssetListPage · "Nuevo equipo"', () => {
  let fixture: ComponentFixture<AssetListPage>;
  let http: HttpTestingController;
  let router: Router;

  const el = () => fixture.nativeElement as HTMLElement;
  const newButton = () =>
    Array.from(el().querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Nuevo equipo'),
    );
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };
  const assets = () => http.expectOne((r) => r.url === '/api/v1/assets');

  async function setup(roles: Role[]) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    TestBed.inject(AuthService).login('a@b.c', 'x').subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: 'u-1', email: 'a@b.c', fullName: 'Mario Activos', active: true, roles },
    });

    fixture = TestBed.createComponent(AssetListPage);
    await settle();
    assets().flush(emptyPage);
    http.expectOne('/api/v1/asset-types').flush([]);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
    await settle();
  }

  afterEach(() => http.verify({ ignoreCancelled: true }));

  it.each<Role>(['ASSET_MANAGER', 'ADMIN'])('%s can register equipment', async (role) => {
    await setup([role]);
    expect(newButton()).toBeTruthy();
  });

  it('an agent reads the inventory but cannot register equipment', async () => {
    await setup(['AGENT']);
    expect(newButton()).toBeUndefined();
  });

  it('opens the form and, once the equipment is registered, goes to its detail', async () => {
    await setup(['ASSET_MANAGER']);
    const open = vi
      .spyOn(TestBed.inject(DialogService), 'open')
      .mockReturnValue({ closed: of('a-99') } as never);

    newButton()!.click();
    await settle();

    expect(open).toHaveBeenCalledWith(
      AssetFormDialog,
      expect.objectContaining({ data: {}, ariaLabel: 'Nuevo equipo' }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/activos', 'a-99']);
  });

  it('reloads the list when the dialog says things changed, and does nothing when it is cancelled', async () => {
    await setup(['ASSET_MANAGER']);
    vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({ closed: of(false) } as never);
    newButton()!.click();
    await settle();
    http.expectNone((r) => r.url === '/api/v1/assets');

    vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({ closed: of(true) } as never);
    newButton()!.click();
    await settle();
    assets().flush(emptyPage);
    http.expectOne('/api/v1/dashboard/summary').flush(summary);
  });
});
