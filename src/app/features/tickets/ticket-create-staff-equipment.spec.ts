import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { Role } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { assetDetail } from '../assets/asset-fixtures';
import { TicketCreatePage } from './ticket-create-page';

describe("TicketCreatePage with an equipment that is not the person's own", () => {
  let fixture: ComponentFixture<TicketCreatePage>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };
  const assetSelect = () => {
    const wrapper = Array.from(el().querySelectorAll('app-field')).find((f) =>
      f.querySelector('label')?.textContent?.includes('Equipo relacionado'),
    )!;
    return wrapper.querySelector<HTMLSelectElement>('select')!;
  };

  async function setup(roles: Role[]) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);

    TestBed.inject(AuthService).login('a@b.c', 'x').subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: 'u-1', email: 'a@b.c', fullName: 'Carlos Agente', active: true, roles },
    });

    fixture = TestBed.createComponent(TicketCreatePage);
    fixture.componentRef.setInput('equipo', 'a-1');
    await settle();
    http.expectOne('/api/v1/categories').flush([{ id: 'cat-1', name: 'Red' }]);
    http.expectOne('/api/v1/assets/mine').flush([]); // el agente no tiene este equipo asignado
    await settle();
  }

  afterEach(() => http.verify({ ignoreCancelled: true }));

  it('IT staff: looks the equipment up and chooses it, since they can link any equipment', async () => {
    await setup(['AGENT']);
    http.expectOne('/api/v1/assets/a-1').flush(assetDetail());
    await settle();
    await settle();

    const labels = Array.from(assetSelect().options).map((o) => o.textContent?.trim());
    expect(labels).toContain('AST-000045 · Dell Latitude 5440');
    expect(assetSelect().value).toBe('a-1');
    expect(TestBed.inject(AuthService).hasAnyRole(['AGENT'])).toBe(true);
  });

  it('an ordinary user: never looks it up, and chooses nothing', async () => {
    await setup(['USER']);
    http.expectNone('/api/v1/assets/a-1');
    expect(assetSelect().value).toBe('');
  });

  it('if the lookup fails, the form still works and chooses nothing', async () => {
    await setup(['ASSET_MANAGER']);
    http.expectOne('/api/v1/assets/a-1').flush(
      {
        timestamp: '',
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: 'x',
        path: '',
        fieldErrors: [],
      },
      { status: 404, statusText: 'Not Found' },
    );
    await settle();

    expect(assetSelect().value).toBe('');
    expect(el().querySelector('form')).not.toBeNull();
  });
});
