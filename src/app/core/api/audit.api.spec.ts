import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuditApi } from './audit.api';

describe('AuditApi', () => {
  let api: AuditApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AuditApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the page and the size, and nothing else when there are no filters (the backend always sorts by date)', () => {
    api.list({ page: 2, size: 50 }).subscribe();
    const request = http.expectOne((r) => r.url === '/api/v1/audit-logs');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('50');
    for (const name of ['actorId', 'action', 'entityType', 'result', 'from', 'to', 'sort']) {
      expect(request.request.params.has(name)).toBe(false);
    }
    request.flush({});
  });

  it('sends each filter that has a value', () => {
    api
      .list({
        page: 0,
        size: 20,
        actorId: 'u-1',
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        result: 'FAILURE',
        from: '2026-10-01T05:00:00.000Z',
        to: '2026-10-09T04:59:59.999Z',
      })
      .subscribe();
    const request = http.expectOne((r) => r.url === '/api/v1/audit-logs');
    expect(request.request.params.get('actorId')).toBe('u-1');
    expect(request.request.params.get('action')).toBe('LOGIN_FAILED');
    expect(request.request.params.get('entityType')).toBe('USER');
    expect(request.request.params.get('result')).toBe('FAILURE');
    expect(request.request.params.get('from')).toBe('2026-10-01T05:00:00.000Z');
    expect(request.request.params.get('to')).toBe('2026-10-09T04:59:59.999Z');
    request.flush({});
  });
});
