import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TicketCreatePage } from './ticket-create-page';

const mine = (id: string, assetTag: string) => ({
  id,
  assetTag,
  type: 'Laptop',
  brand: 'Dell',
  model: 'Latitude',
  status: 'ASSIGNED',
  location: null,
  assignedTo: null,
});

describe('TicketCreatePage with ?equipo=', () => {
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

  async function setup(equipo?: string) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TicketCreatePage);
    if (equipo !== undefined) {
      fixture.componentRef.setInput('equipo', equipo);
    }
    await settle();
    http.expectOne('/api/v1/categories').flush([{ id: 'cat-1', name: 'Red' }]);
    http
      .expectOne('/api/v1/assets/mine')
      .flush([mine('a-1', 'AST-000045'), mine('a-2', 'AST-000046')]);
    await settle();
    await settle();
  }

  afterEach(() => http.verify({ ignoreCancelled: true }));

  it("chooses the equipment of the URL when it is one of the person's own", async () => {
    await setup('a-2');
    expect(assetSelect().value).toBe('a-2');
  });

  it('chooses nothing when no equipment comes in the URL', async () => {
    await setup();
    expect(assetSelect().value).toBe('');
  });

  it("ignores an equipment that is not in the person's list", async () => {
    await setup('a-999');
    expect(assetSelect().value).toBe('');
  });

  it('does not count what was chosen for the person as an unsaved change', async () => {
    await setup('a-1');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('does detect it when the person then changes the equipment', async () => {
    await setup('a-1');
    const select = assetSelect();
    select.value = 'a-2';
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });
});
