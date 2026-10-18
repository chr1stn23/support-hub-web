import {
  DEFAULT_USER_SORT,
  UserListState,
  hasActiveUserFilters,
  parseUserListState,
  toUserApiQuery,
  toUserUrlParams,
} from './user-query';

const base: UserListState = {
  view: 'activos',
  role: '',
  search: '',
  page: 0,
  size: 20,
  sort: DEFAULT_USER_SORT,
};

describe('parseUserListState', () => {
  it('uses the defaults when the URL has nothing', () => {
    expect(parseUserListState({})).toEqual(base);
  });

  it('reads every parameter (the page starts at 1 in the URL)', () => {
    expect(
      parseUserListState({
        estado: 'inactivos',
        rol: 'AGENT',
        buscar: ' ana ',
        pagina: '3',
        tamano: '50',
        orden: 'email,desc',
      }),
    ).toEqual({
      view: 'inactivos',
      role: 'AGENT',
      search: 'ana',
      page: 2,
      size: 50,
      sort: { property: 'email', direction: 'desc' },
    });
  });

  it.each([
    ['estado', 'inventado'],
    ['rol', 'HACKER'],
    ['pagina', 'abc'],
    ['pagina', '0'],
    ['tamano', '999'],
    ['orden', 'passwordHash,asc'],
    ['orden', ',desc'],
  ])('ignores %s=%s and falls back to the default', (key, value) => {
    expect(parseUserListState({ [key]: value })).toEqual(base);
  });

  it('caps the search text', () => {
    expect(parseUserListState({ buscar: 'x'.repeat(500) }).search).toHaveLength(100);
  });
});

describe('toUserUrlParams', () => {
  it('writes nothing for the default state', () => {
    expect(toUserUrlParams(base)).toEqual({});
  });

  it('writes only what is not the default, with the page starting at 1', () => {
    expect(
      toUserUrlParams({ ...base, view: 'todos', role: 'ADMIN', search: 'ana', page: 1, size: 10 }),
    ).toEqual({
      estado: 'todos',
      rol: 'ADMIN',
      buscar: 'ana',
      pagina: '2',
      tamano: '10',
    });
  });

  it('round-trips with parseUserListState', () => {
    const state: UserListState = {
      view: 'inactivos',
      role: 'ASSET_MANAGER',
      search: 'x',
      page: 4,
      size: 100,
      sort: { property: 'createdAt', direction: 'desc' },
    };
    expect(parseUserListState(toUserUrlParams(state))).toEqual(state);
  });
});

describe('toUserApiQuery', () => {
  it.each([
    ['activos', true],
    ['inactivos', false],
    ['todos', undefined],
  ] as const)('the "%s" tab asks for active=%s', (view, active) => {
    expect(toUserApiQuery({ ...base, view }).active).toBe(active);
  });

  it('adds the role, the search, the page, the size and the sort', () => {
    expect(
      toUserApiQuery({
        ...base,
        role: 'AGENT',
        search: 'ana',
        page: 2,
        size: 50,
        sort: { property: 'email', direction: 'desc' },
      }),
    ).toEqual({
      page: 2,
      size: 50,
      sort: 'email,desc',
      active: true,
      role: 'AGENT',
      search: 'ana',
    });
  });

  it('leaves out the filters that are empty', () => {
    const query = toUserApiQuery(base);
    expect(query.role).toBeUndefined();
    expect(query.search).toBeUndefined();
  });
});

describe('hasActiveUserFilters', () => {
  it('is true only with a search or a role', () => {
    expect(hasActiveUserFilters(base)).toBe(false);
    expect(hasActiveUserFilters({ ...base, view: 'todos', page: 3 })).toBe(false);
    expect(hasActiveUserFilters({ ...base, search: 'x' })).toBe(true);
    expect(hasActiveUserFilters({ ...base, role: 'USER' })).toBe(true);
  });
});
