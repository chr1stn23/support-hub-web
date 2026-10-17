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
});
