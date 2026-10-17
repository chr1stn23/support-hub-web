import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AssetsApi } from './assets.api';

describe('AssetsApi', () => {
  let api: AssetsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AssetsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends page, size and sort, and nothing else when there are no filters', () => {
    api.list({ page: 2, size: 50, sort: 'brand,desc' }).subscribe();

    const request = http.expectOne((r) => r.url === '/api/v1/assets');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('50');
    expect(request.request.params.get('sort')).toBe('brand,desc');
    for (const name of ['status', 'assetTypeId', 'search']) {
      expect(request.request.params.has(name)).toBe(false);
    }
    request.flush({});
  });

  it('sends the status, the type and the search when they exist', () => {
    api
      .list({
        page: 0,
        size: 20,
        sort: 'assetTag,asc',
        status: 'AVAILABLE',
        assetTypeId: 'type-1',
        search: 'dell 5440',
      })
      .subscribe();

    const request = http.expectOne((r) => r.url === '/api/v1/assets');
    expect(request.request.params.get('status')).toBe('AVAILABLE');
    expect(request.request.params.get('assetTypeId')).toBe('type-1');
    expect(request.request.params.get('search')).toBe('dell 5440');
    request.flush({});
  });

  it('lists the asset types', () => {
    let result: unknown;
    api.types().subscribe((types) => (result = types));

    http.expectOne('/api/v1/asset-types').flush([{ id: 't-1', name: 'Laptop' }]);
    expect(result).toEqual([{ id: 't-1', name: 'Laptop' }]);
  });

  it('reads one equipment, its assignments and its related tickets', () => {
    api.get('a-1').subscribe();
    http.expectOne('/api/v1/assets/a-1').flush({});
    api.assignments('a-1').subscribe();
    http.expectOne('/api/v1/assets/a-1/assignments').flush([]);
    api.relatedTickets('a-1').subscribe();
    http.expectOne('/api/v1/assets/a-1/tickets').flush([]);
  });

  it('registers an equipment', () => {
    api
      .create({
        assetTypeId: 't-1',
        brand: 'Dell',
        model: 'XPS',
        serialNumber: null,
        location: null,
      })
      .subscribe();
    const request = http.expectOne('/api/v1/assets');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      assetTypeId: 't-1',
      brand: 'Dell',
      model: 'XPS',
      serialNumber: null,
      location: null,
    });
    request.flush({});
  });

  it('edits with PATCH and the version that was read', () => {
    api.update('a-1', { version: 4, location: '' }).subscribe();
    const request = http.expectOne('/api/v1/assets/a-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ version: 4, location: '' });
    request.flush({});
  });

  it('assigns and transfers with the person and the note', () => {
    api.assign('a-1', { userId: 'u-2', notes: 'Para el trabajo remoto' }).subscribe();
    const assign = http.expectOne('/api/v1/assets/a-1/assign');
    expect(assign.request.body).toEqual({ userId: 'u-2', notes: 'Para el trabajo remoto' });
    assign.flush({});

    api.transfer('a-1', { userId: 'u-3', notes: null }).subscribe();
    const transfer = http.expectOne('/api/v1/assets/a-1/transfer');
    expect(transfer.request.body).toEqual({ userId: 'u-3', notes: null });
    transfer.flush({});
  });

  it('returns an equipment with an empty body, and changes its status', () => {
    api.returnAsset('a-1').subscribe();
    const returned = http.expectOne('/api/v1/assets/a-1/return');
    expect(returned.request.method).toBe('POST');
    expect(returned.request.body).toEqual({});
    returned.flush({});

    api.changeStatus('a-1', 'MAINTENANCE').subscribe();
    const status = http.expectOne('/api/v1/assets/a-1/status');
    expect(status.request.body).toEqual({ status: 'MAINTENANCE' });
    status.flush({});
  });
});
