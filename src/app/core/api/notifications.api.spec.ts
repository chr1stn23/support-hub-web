import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { NotificationsApi } from './notifications.api';

describe('NotificationsApi', () => {
  let api: NotificationsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(NotificationsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists with the page, the size and whether only the unread ones (never a sort: the backend ignores it)', () => {
    api.list({ page: 2, size: 50, unreadOnly: true }).subscribe();
    const request = http.expectOne((r) => r.url === '/api/v1/notifications');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('50');
    expect(request.request.params.get('unreadOnly')).toBe('true');
    expect(request.request.params.has('sort')).toBe(false);
    request.flush({});
  });

  it('sends unreadOnly=false for "Todas"', () => {
    api.list({ page: 0, size: 20, unreadOnly: false }).subscribe();
    const request = http.expectOne((r) => r.url === '/api/v1/notifications');
    expect(request.request.params.get('unreadOnly')).toBe('false');
    request.flush({});
  });

  it('marks one as read with POST', () => {
    api.markRead('n-1').subscribe();
    const request = http.expectOne('/api/v1/notifications/n-1/read');
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('marks everything as read with POST', () => {
    api.markAllRead().subscribe();
    const request = http.expectOne('/api/v1/notifications/read-all');
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
