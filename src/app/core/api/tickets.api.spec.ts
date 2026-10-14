import { TicketsApi } from '@core/api/tickets.api';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

describe('TicketsApi.list', () => {
  let api: TicketsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TicketsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends page, size and sort, and joins the multiple values with commas', () => {
    api
      .list({
        page: 2,
        size: 50,
        sort: 'priority,desc',
        statuses: ['OPEN', 'WAITING'],
        priorities: ['HIGH', 'CRITICAL'],
      })
      .subscribe();

    const request = http.expectOne((r) => r.url === '/api/v1/tickets');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('50');
    expect(request.request.params.get('sort')).toBe('priority,desc');
    expect(request.request.params.get('status')).toBe('OPEN,WAITING');
    expect(request.request.params.get('priority')).toBe('HIGH,CRITICAL');
    request.flush({});
  });

  it('sends only the filters that have a value', () => {
    api
      .list({ page: 0, size: 20, sort: 'createdAt,desc', statuses: [], priorities: [] })
      .subscribe();

    const request = http.expectOne((r) => r.url === '/api/v1/tickets');
    for (const name of ['status', 'priority', 'categoryId', 'assignedTo', 'unassigned', 'search']) {
      expect(request.request.params.has(name)).toBe(false);
    }
    request.flush({});
  });

  it('sends the optional filters when they exist', () => {
    api
      .list({
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
        statuses: ['OPEN'],
        priorities: [],
        categoryId: 'cat-1',
        assignedTo: 'user-1',
        unassigned: true,
        search: 'vpn caída',
      })
      .subscribe();

    const request = http.expectOne((r) => r.url === '/api/v1/tickets');
    expect(request.request.params.get('categoryId')).toBe('cat-1');
    expect(request.request.params.get('assignedTo')).toBe('user-1');
    expect(request.request.params.get('unassigned')).toBe('true');
    expect(request.request.params.get('search')).toBe('vpn caída');
    request.flush({});
  });

  it('takes a ticket with an empty body, so the backend assigns it to whoever asks', () => {
    api.take('t-1').subscribe();
    const request = http.expectOne('/api/v1/tickets/t-1/assign');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({});
  });
});
