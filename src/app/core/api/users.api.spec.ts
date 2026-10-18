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

  it('searches any active person, with no role filter', () => {
    api.searchPeople('ana').subscribe();
    const request = http.expectOne((r) => r.url === '/api/v1/users/lookup');
    expect(request.request.params.get('search')).toBe('ana');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.has('role')).toBe(false);
    request.flush(page());
  });

  it('sends no search text when it is empty', () => {
    api.searchPeople('').subscribe();
    const request = http.expectOne((r) => r.url === '/api/v1/users/lookup');
    expect(request.request.params.has('search')).toBe(false);
    request.flush(page());
  });

  describe('administration', () => {
    it('lists with page, size and sort, and only the filters that have a value', () => {
      api.list({ page: 2, size: 50, sort: 'email,desc' }).subscribe();
      const request = http.expectOne((r) => r.url === '/api/v1/users');
      expect(request.request.params.get('page')).toBe('2');
      expect(request.request.params.get('sort')).toBe('email,desc');
      for (const name of ['active', 'role', 'search']) {
        expect(request.request.params.has(name)).toBe(false);
      }
      request.flush({});
    });

    it('sends the state (also when it is false), the role and the search', () => {
      api
        .list({
          page: 0,
          size: 20,
          sort: 'fullName,asc',
          active: false,
          role: 'AGENT',
          search: 'ana',
        })
        .subscribe();
      const request = http.expectOne((r) => r.url === '/api/v1/users');
      expect(request.request.params.get('active')).toBe('false');
      expect(request.request.params.get('role')).toBe('AGENT');
      expect(request.request.params.get('search')).toBe('ana');
      request.flush({});
    });

    it('reads, creates and edits a user', () => {
      api.get('u-2').subscribe();
      http.expectOne('/api/v1/users/u-2').flush({});

      api
        .create({ email: 'a@x.com', fullName: 'Ana', password: 'Demo1234!', roles: ['USER'] })
        .subscribe();
      const create = http.expectOne('/api/v1/users');
      expect(create.request.method).toBe('POST');
      expect(create.request.body).toEqual({
        email: 'a@x.com',
        fullName: 'Ana',
        password: 'Demo1234!',
        roles: ['USER'],
      });
      create.flush({});

      api.update('u-2', { version: 3, fullName: 'Nuevo' }).subscribe();
      const update = http.expectOne('/api/v1/users/u-2');
      expect(update.request.method).toBe('PATCH');
      expect(update.request.body).toEqual({ version: 3, fullName: 'Nuevo' });
      update.flush({});
    });

    it('changes roles with PUT, and activates, deactivates and resets the password with POST', () => {
      api.changeRoles('u-2', ['AGENT', 'USER']).subscribe();
      const roles = http.expectOne('/api/v1/users/u-2/roles');
      expect(roles.request.method).toBe('PUT');
      expect(roles.request.body).toEqual({ roles: ['AGENT', 'USER'] });
      roles.flush({});

      api.deactivate('u-2').subscribe();
      expect(http.expectOne('/api/v1/users/u-2/deactivate').request.method).toBe('POST');
      api.activate('u-2').subscribe();
      expect(http.expectOne('/api/v1/users/u-2/activate').request.method).toBe('POST');
      // los dos expectOne anteriores dejan las peticiones sin responder: las respondemos para que verify() no falle
      http.match(() => true).forEach((r) => r.flush({}));

      api.resetPassword('u-2', 'Nueva1234').subscribe();
      const reset = http.expectOne('/api/v1/users/u-2/password');
      expect(reset.request.body).toEqual({ newPassword: 'Nueva1234' });
      reset.flush(null, { status: 204, statusText: 'No Content' });
    });
  });

  it('changes the own password with the current one and the new one', () => {
    api.changeOwnPassword('Vieja1234!', 'Nueva1234!').subscribe();
    const request = http.expectOne('/api/v1/users/me/password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      currentPassword: 'Vieja1234!',
      newPassword: 'Nueva1234!',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
