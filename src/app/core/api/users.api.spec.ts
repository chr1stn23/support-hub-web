import { mergeSorted, UsersApi } from '@core/api/users.api';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

const person = (id: string, fullName: string) => ({ id, fullName, email: `${id}@x.com` });
const page = (...content: ReturnType<typeof person>[]) => ({
  content,
  page: 0,
  size: 100,
  totalElements: content.length,
  totalPages: 1,
});

describe('mergeSorted', () => {
  it('removes repeated people and sorts by name', () => {
    const merged = mergeSorted(
      [person('1', 'Óscar Agente'), person('2', 'Carlos Agente')],
      [person('2', 'Carlos Agente'), person('3', 'Ana Admin')],
    );
    expect(merged.map((p) => p.fullName)).toEqual(['Ana Admin', 'Carlos Agente', 'Óscar Agente']);
  });
});

describe('UsersApi', () => {
  let api: UsersApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(UsersApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('looks people up by role, with the largest page the backend allows', () => {
    api.lookup('AGENT').subscribe();
    const request = http.expectOne((r) => r.url === '/api/v1/users/lookup');
    expect(request.request.params.get('role')).toBe('AGENT');
    expect(request.request.params.get('size')).toBe('100');
    expect(request.request.params.has('search')).toBe(false);
    request.flush(page());
  });

  it('adds the search text when there is one', () => {
    api.lookup('ADMIN', 'ana').subscribe();
    const request = http.expectOne((r) => r.url === '/api/v1/users/lookup');
    expect(request.request.params.get('search')).toBe('ana');
    request.flush(page());
  });

  it('offers agents and administrators together, once each', () => {
    let result: string[] = [];
    api.assignableAgents().subscribe((list) => (result = list.map((p) => p.fullName)));

    http
      .expectOne((r) => r.params.get('role') === 'AGENT')
      .flush(page(person('2', 'Carlos Agente'), person('9', 'Ana Admin')));
    http.expectOne((r) => r.params.get('role') === 'ADMIN').flush(page(person('9', 'Ana Admin')));

    expect(result).toEqual(['Ana Admin', 'Carlos Agente']);
  });
});
