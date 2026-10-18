import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '@core/auth/auth.service';
import { DialogService } from '@shared/ui';
import { apiError } from '../assets/asset-fixtures';
import { UserFormDialog } from './user-form-dialog';
import { UserListPage } from './user-list-page';
import { adminPage, userAdmin } from './user-fixtures';

const USERS = '/api/v1/users';

describe('UserListPage', () => {
  let fixture: ComponentFixture<UserListPage>;
  let http: HttpTestingController;
  let router: Router;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const users = () => http.expectOne((r) => r.url === USERS);
  const settle = async () => {
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  };

  async function setup(params: Record<string, string> = {}) {
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
      user: { id: 'u-1', email: 'a@b.c', fullName: 'Ana Admin', active: true, roles: ['ADMIN'] },
    });

    fixture = TestBed.createComponent(UserListPage);
    for (const [name, value] of Object.entries(params)) {
      fixture.componentRef.setInput(name, value);
    }
    await settle();
  }

  async function loadWith(content = [userAdmin()], total = content.length) {
    users().flush(adminPage(content, total));
    await settle();
  }

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    vi.useRealTimers();
  });

  it('asks for the active users, by name, and shows each row', async () => {
    await setup();
    const request = users();
    expect(request.request.params.get('active')).toBe('true');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('sort')).toBe('fullName,asc');
    expect(request.request.params.has('role')).toBe(false);
    request.flush(adminPage([userAdmin()]));
    await settle();

    expect(text()).toContain('Elena Agente');
    expect(text()).toContain('elena@supporthub.local');
    expect(text()).toContain('Agente');
    expect(text()).toContain('Activo');
    expect(text()).toContain('hace 10 min');
  });

  it('links each name to the detail, and marks the own account', async () => {
    await setup();
    await loadWith([
      userAdmin(),
      userAdmin({ id: 'u-1', fullName: 'Ana Admin', roles: ['ADMIN'] }),
    ]);

    const links = Array.from(el().querySelectorAll<HTMLAnchorElement>('a.name'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/usuarios/u-2', '/usuarios/u-1']);
    const rows = Array.from(el().querySelectorAll('tbody tr'));
    expect(rows[0].textContent).not.toContain('Tú');
    expect(rows[1].textContent).toContain('Tú');
  });

  it('shows "Nunca" when someone never signed in, and "Inactivo" for a deactivated account', async () => {
    await setup();
    await loadWith([userAdmin({ lastLoginAt: null, active: false })]);
    expect(text()).toContain('Nunca');
    expect(text()).toContain('Inactivo');
  });

  it('shows every role of a person, the most influential first', async () => {
    await setup();
    await loadWith([userAdmin({ roles: ['USER', 'ADMIN'] })]);
    const chips = Array.from(el().querySelectorAll('tbody .chips app-chip')).map((c) =>
      c.textContent?.trim(),
    );
    expect(chips).toEqual(['Administrador', 'Usuario']);
  });

  it('has a tab per state, and turns the one in the URL into the filter the backend understands', async () => {
    await setup({ estado: 'inactivos' });
    const request = users();
    expect(request.request.params.get('active')).toBe('false');
    request.flush(adminPage([]));
    await settle();

    expect(
      Array.from(el().querySelectorAll('.link-tab')).map((a) => a.textContent?.trim()),
    ).toEqual(['Activos', 'Inactivos', 'Todos']);
    expect(el().querySelector('.link-tab.is-active')?.getAttribute('aria-current')).toBe('page');
  });

  it('asks for everybody on the "Todos" tab', async () => {
    await setup({ estado: 'todos' });
    const request = users();
    expect(request.request.params.has('active')).toBe(false);
    request.flush(adminPage([]));
  });

  it('passes the role, the search, the page and the sort of the URL', async () => {
    await setup({ rol: 'AGENT', buscar: 'ana', pagina: '3', orden: 'email,desc', tamano: '50' });
    const request = users();
    expect(request.request.params.get('role')).toBe('AGENT');
    expect(request.request.params.get('search')).toBe('ana');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('50');
    expect(request.request.params.get('sort')).toBe('email,desc');
    request.flush(adminPage([]));
  });

  it('ignores nonsense in the URL instead of failing', async () => {
    await setup({
      estado: 'inventado',
      rol: 'HACKER',
      pagina: 'abc',
      tamano: '999',
      orden: 'passwordHash,asc',
    });
    const request = users();
    expect(request.request.params.get('active')).toBe('true');
    expect(request.request.params.has('role')).toBe(false);
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('sort')).toBe('fullName,asc');
    request.flush(adminPage([]));
  });

  it('filters by role, going back to the first page', async () => {
    await setup({ pagina: '2' });
    await loadWith([userAdmin()], 60);

    const select = el().querySelector<HTMLSelectElement>('select[aria-label="Filtrar por rol"]')!;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual([
      'Todos los roles',
      'Administrador',
      'Agente',
      'Gestor de activos',
      'Usuario',
    ]);
    select.value = 'AGENT';
    select.dispatchEvent(new Event('change'));
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { rol: 'AGENT' } }),
    );
  });

  it('only sorts by name and email', async () => {
    await setup();
    await loadWith();
    const sortable = Array.from(el().querySelectorAll('th'))
      .filter((th) => th.querySelector('button'))
      .map((th) => th.textContent?.trim());
    expect(sortable).toEqual(['Nombre', 'Correo']);

    Array.from(el().querySelectorAll('th'))
      .find((th) => th.textContent?.includes('Correo'))!
      .querySelector('button')!
      .click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { orden: 'email,asc' } }),
    );
  });

  it('changes page (the URL counts from 1)', async () => {
    await setup();
    await loadWith([userAdmin()], 60);
    el().querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')!.click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { pagina: '2' } }),
    );
  });

  it('waits for the person to stop typing before searching', async () => {
    await setup();
    await loadWith();
    vi.useFakeTimers();

    const input = el().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'el';
    input.dispatchEvent(new Event('input'));
    input.value = 'elena';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(200);
    expect(router.navigate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(150);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { buscar: 'elena' } }),
    );
  });

  it('tells apart "nothing here" from "nothing matches your search"', async () => {
    await setup();
    await loadWith([]);
    expect(text()).toContain('No hay usuarios en esta vista');

    TestBed.resetTestingModule();
    await setup({ buscar: 'zzz' });
    await loadWith([]);
    expect(text()).toContain('Ningún usuario coincide con tu búsqueda');
  });

  it('clears the filters, keeping the tab', async () => {
    await setup({ estado: 'todos', buscar: 'zzz', rol: 'AGENT' });
    await loadWith([]);
    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Limpiar filtros'))!
      .click();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { estado: 'todos' } }),
    );
  });

  it('shows the error in Spanish with a retry', async () => {
    await setup();
    users().flush(apiError(500, 'INTERNAL_ERROR'), { status: 500, statusText: 'Error' });
    await settle();
    expect(text()).toContain('No pudimos cargar los usuarios');

    Array.from(el().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Reintentar')!
      .click();
    await settle();
    await loadWith();
    expect(text()).toContain('Elena Agente');
  });

  describe('"Nuevo usuario"', () => {
    it('opens the form, and once the account is created goes to its detail', async () => {
      await setup();
      await loadWith();
      const open = vi
        .spyOn(TestBed.inject(DialogService), 'open')
        .mockReturnValue({ closed: of('u-99') } as never);

      Array.from(el().querySelectorAll('button'))
        .find((b) => b.textContent?.includes('Nuevo usuario'))!
        .click();
      await settle();

      expect(open).toHaveBeenCalledWith(
        UserFormDialog,
        expect.objectContaining({ data: {}, ariaLabel: 'Nuevo usuario' }),
      );
      expect(router.navigate).toHaveBeenCalledWith(['/usuarios', 'u-99']);
    });

    it('does nothing when the dialog is cancelled', async () => {
      await setup();
      await loadWith();
      vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({
        closed: of(false),
      } as never);

      Array.from(el().querySelectorAll('button'))
        .find((b) => b.textContent?.includes('Nuevo usuario'))!
        .click();
      await settle();
      expect(router.navigate).not.toHaveBeenCalled();
      http.expectNone((r) => r.url === USERS);
    });
  });
});
