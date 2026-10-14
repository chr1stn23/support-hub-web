import {
  DEFAULT_SORT,
  hasActiveFilters,
  ListState,
  parseListState,
  toApiQuery,
  toUrlParams,
  viewCount,
  viewsFor,
} from '@features/tickets/ticket-query';
import { DashboardSummary } from '@core/api/models';

const CATEGORY = '0c9d6e0e-7b1d-4c0a-9f0e-3a6f5f0c1b11';
const ME = 'me-id';

const base: ListState = {
  view: 'abiertos',
  search: '',
  categoryId: '',
  priority: '',
  page: 0,
  size: 20,
  sort: DEFAULT_SORT,
};

describe('viewsFor', () => {
  it('hides "Asignados a mí" from people who are not agents', () => {
    expect(viewsFor(false).map((v) => v.id)).toEqual([
      'abiertos',
      'sin-asignar',
      'prioridad-alta',
      'resueltos',
      'todos',
    ]);
    expect(viewsFor(true).map((v) => v.id)).toContain('mios');
  });
});

describe('parseListState', () => {
  it('uses the defaults when the URL has nothing', () => {
    expect(parseListState({}, true)).toEqual(base);
  });

  it('reads every parameter (the page starts at 1 in the URL)', () => {
    const state = parseListState(
      {
        vista: 'prioridad-alta',
        buscar: ' vpn ',
        categoria: CATEGORY,
        prioridad: 'HIGH',
        pagina: '3',
        tamano: '50',
        orden: 'priority,desc',
      },
      true,
    );
    expect(state).toEqual({
      view: 'prioridad-alta',
      search: 'vpn',
      categoryId: CATEGORY,
      priority: 'HIGH',
      page: 2,
      size: 50,
      sort: { property: 'priority', direction: 'desc' },
    });
  });

  it.each([
    ['pagina', 'abc'],
    ['pagina', '0'],
    ['pagina', '-2'],
    ['pagina', '1.5'],
    ['tamano', '999'],
    ['tamano', 'abc'],
    ['tamano', '0'],
    ['vista', 'inventada'],
    ['prioridad', 'URGENT'],
    ['categoria', 'no-es-un-uuid'],
    ['orden', 'passwordHash,asc'],
    ['orden', ',desc'],
  ])('ignores %s=%s and falls back to the default', (key, value) => {
    expect(parseListState({ [key]: value }, true)).toEqual(base);
  });

  it('does not let a non-agent into the agent view', () => {
    expect(parseListState({ vista: 'mios' }, false).view).toBe('abiertos');
    expect(parseListState({ vista: 'mios' }, true).view).toBe('mios');
  });

  it('caps the search text', () => {
    expect(parseListState({ buscar: 'x'.repeat(500) }, true).search).toHaveLength(100);
  });
});

describe('toUrlParams', () => {
  it('writes nothing for the default state, so the clean URL stays clean', () => {
    expect(toUrlParams(base)).toEqual({});
  });

  it('writes only what is not the default, with the page starting at 1', () => {
    expect(toUrlParams({ ...base, view: 'sin-asignar', search: 'vpn', page: 1, size: 50 })).toEqual(
      {
        vista: 'sin-asignar',
        buscar: 'vpn',
        pagina: '2',
        tamano: '50',
      },
    );
  });

  it('writes the sort only when it differs from the default', () => {
    expect(toUrlParams({ ...base, sort: { property: 'title', direction: 'asc' } })).toEqual({
      orden: 'title,asc',
    });
  });

  it('does not write the priority in the high-priority view, which already defines it', () => {
    expect(toUrlParams({ ...base, view: 'prioridad-alta', priority: 'LOW' })).toEqual({
      vista: 'prioridad-alta',
    });
  });

  it('round-trips with parseListState', () => {
    const state: ListState = {
      view: 'mios',
      search: 'laptop',
      categoryId: CATEGORY,
      priority: 'CRITICAL',
      page: 4,
      size: 10,
      sort: { property: 'ticketCode', direction: 'asc' },
    };
    expect(parseListState(toUrlParams(state), true)).toEqual(state);
  });
});

describe('toApiQuery', () => {
  it('"abiertos": the three open statuses', () => {
    expect(toApiQuery(base, ME).statuses).toEqual(['OPEN', 'IN_PROGRESS', 'WAITING']);
  });

  it('"sin-asignar": OPEN and unassigned', () => {
    const query = toApiQuery({ ...base, view: 'sin-asignar' }, ME);
    expect(query.statuses).toEqual(['OPEN']);
    expect(query.unassigned).toBe(true);
  });

  it('"mios": the tickets assigned to the person, in progress or waiting', () => {
    const query = toApiQuery({ ...base, view: 'mios' }, ME);
    expect(query.assignedTo).toBe(ME);
    expect(query.statuses).toEqual(['IN_PROGRESS', 'WAITING']);
  });

  it('"prioridad-alta": open and HIGH or CRITICAL, whatever the priority filter says', () => {
    const query = toApiQuery({ ...base, view: 'prioridad-alta', priority: 'LOW' }, ME);
    expect(query.statuses).toEqual(['OPEN', 'IN_PROGRESS', 'WAITING']);
    expect(query.priorities).toEqual(['HIGH', 'CRITICAL']);
  });

  it('"resueltos" and "todos"', () => {
    expect(toApiQuery({ ...base, view: 'resueltos' }, ME).statuses).toEqual(['RESOLVED']);
    expect(toApiQuery({ ...base, view: 'todos' }, ME).statuses).toEqual([]);
  });

  it('adds the extra filters, the page, the size and the sort', () => {
    const query = toApiQuery(
      {
        ...base,
        search: 'vpn',
        categoryId: CATEGORY,
        priority: 'HIGH',
        page: 2,
        size: 50,
        sort: { property: 'priority', direction: 'desc' },
      },
      ME,
    );
    expect(query).toMatchObject({
      search: 'vpn',
      categoryId: CATEGORY,
      priorities: ['HIGH'],
      page: 2,
      size: 50,
      sort: 'priority,desc',
    });
  });

  it('leaves out the filters that are empty', () => {
    const query = toApiQuery(base, ME);
    expect(query.search).toBeUndefined();
    expect(query.categoryId).toBeUndefined();
    expect(query.priorities).toEqual([]);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the plain state and for a view change', () => {
    expect(hasActiveFilters(base)).toBe(false);
    expect(hasActiveFilters({ ...base, view: 'resueltos', page: 3 })).toBe(false);
  });

  it('is true with a search, a category or a priority', () => {
    expect(hasActiveFilters({ ...base, search: 'x' })).toBe(true);
    expect(hasActiveFilters({ ...base, categoryId: CATEGORY })).toBe(true);
    expect(hasActiveFilters({ ...base, priority: 'LOW' })).toBe(true);
  });

  it('ignores the priority in the high-priority view (it is not shown there)', () => {
    expect(hasActiveFilters({ ...base, view: 'prioridad-alta', priority: 'LOW' })).toBe(false);
  });
});

describe('viewCount', () => {
  const summary: DashboardSummary = {
    scope: 'ALL',
    tickets: {
      open: 12,
      unassigned: 3,
      highPriorityOpen: 4,
      byStatus: { OPEN: 3, IN_PROGRESS: 6, WAITING: 3, RESOLVED: 5, CLOSED: 10, CANCELLED: 2 },
    },
    mine: { assignedOpen: 5, resolvedInPeriod: 1 },
  };

  it('takes each number from the summary', () => {
    expect(viewCount('abiertos', summary)).toBe(12);
    expect(viewCount('sin-asignar', summary)).toBe(3);
    expect(viewCount('mios', summary)).toBe(5);
    expect(viewCount('prioridad-alta', summary)).toBe(4);
    expect(viewCount('resueltos', summary)).toBe(5);
    expect(viewCount('todos', summary)).toBe(29);
  });

  it('is null until the summary is known, and for "mios" without agent data', () => {
    expect(viewCount('abiertos', null)).toBeNull();
    expect(viewCount('mios', { ...summary, mine: null })).toBeNull();
  });
});
