import {
  AuditListState,
  dateRangeProblem,
  endOfDayIso,
  hasActiveAuditFilters,
  parseAuditState,
  startOfDayIso,
  toAuditApiQuery,
  toAuditUrlParams,
  validDay,
} from './audit-query';

const ACTOR = '0c9d6e0e-7b1d-4c0a-9f0e-3a6f5f0c1b11';
const base: AuditListState = {
  action: '',
  area: '',
  result: '',
  actorId: '',
  from: '',
  to: '',
  page: 0,
  size: 20,
};

describe('validDay', () => {
  it('accepts a real day', () => {
    expect(validDay('2026-10-08')).toBe('2026-10-08');
    expect(validDay('2028-02-29')).toBe('2028-02-29');
  });

  it.each([
    '2026-02-30',
    '2026-13-01',
    '2026-10-32',
    '2027-02-29',
    '08/10/2026',
    '2026-1-8',
    '',
    'hola',
    undefined,
  ])('rejects %j', (value) => {
    expect(validDay(value)).toBe('');
  });
});

describe('the day as an instant, in the time zone of whoever looks', () => {
  it('starts at midnight and ends one millisecond before the next one', () => {
    const start = new Date(startOfDayIso('2026-10-08'));
    expect([
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
      start.getHours(),
      start.getMinutes(),
    ]).toEqual([2026, 9, 8, 0, 0]);

    const end = new Date(endOfDayIso('2026-10-08'));
    expect([
      end.getDate(),
      end.getHours(),
      end.getMinutes(),
      end.getSeconds(),
      end.getMilliseconds(),
    ]).toEqual([8, 23, 59, 59, 999]);
  });
});

describe('parseAuditState', () => {
  it('uses the defaults when the URL has nothing', () => {
    expect(parseAuditState({})).toEqual(base);
  });

  it('reads every parameter (the page starts at 1 in the URL)', () => {
    expect(
      parseAuditState({
        accion: 'LOGIN_FAILED',
        area: 'seguridad',
        resultado: 'fallo',
        persona: ACTOR,
        desde: '2026-10-01',
        hasta: '2026-10-08',
        pagina: '3',
        tamano: '50',
      }),
    ).toEqual({
      action: 'LOGIN_FAILED',
      area: 'seguridad',
      result: 'fallo',
      actorId: ACTOR,
      from: '2026-10-01',
      to: '2026-10-08',
      page: 2,
      size: 50,
    });
  });

  it.each([
    ['accion', 'HACKER'],
    ['area', 'inventada'],
    ['resultado', 'quizas'],
    ['persona', 'no-es-un-uuid'],
    ['desde', '2026-13-45'],
    ['hasta', 'ayer'],
    ['pagina', 'abc'],
    ['pagina', '0'],
    ['tamano', '999'],
  ])('ignores %s=%s and falls back to the default', (key, value) => {
    expect(parseAuditState({ [key]: value })).toEqual(base);
  });
});

describe('toAuditUrlParams', () => {
  it('writes nothing for the default state', () => {
    expect(toAuditUrlParams(base)).toEqual({});
  });

  it('writes only what is not the default, with the page starting at 1', () => {
    expect(
      toAuditUrlParams({
        ...base,
        action: 'USER_CREATED',
        area: 'usuario',
        from: '2026-10-01',
        page: 1,
        size: 10,
      }),
    ).toEqual({
      accion: 'USER_CREATED',
      area: 'usuario',
      desde: '2026-10-01',
      pagina: '2',
      tamano: '10',
    });
  });

  it('round-trips with parseAuditState', () => {
    const state: AuditListState = {
      action: 'TICKET_ASSIGNED',
      area: 'ticket',
      result: 'exito',
      actorId: ACTOR,
      from: '2026-09-01',
      to: '2026-09-30',
      page: 4,
      size: 100,
    };
    expect(parseAuditState(toAuditUrlParams(state))).toEqual(state);
  });
});

describe('toAuditApiQuery', () => {
  it('translates the area and the result into what the backend understands', () => {
    expect(toAuditApiQuery({ ...base, area: 'equipo', result: 'fallo' })).toMatchObject({
      entityType: 'ASSET',
      result: 'FAILURE',
    });
    expect(toAuditApiQuery({ ...base, area: 'seguridad', result: 'exito' })).toMatchObject({
      entityType: 'SECURITY',
      result: 'SUCCESS',
    });
  });

  it('turns the days into instants, the first from the start of the day and the second to its end', () => {
    const query = toAuditApiQuery({ ...base, from: '2026-10-01', to: '2026-10-08' });
    expect(new Date(query.from!).getHours()).toBe(0);
    expect(new Date(query.to!).getHours()).toBe(23);
  });

  it('adds the action, the person, the page and the size', () => {
    expect(
      toAuditApiQuery({ ...base, action: 'LOGOUT', actorId: ACTOR, page: 2, size: 50 }),
    ).toMatchObject({
      action: 'LOGOUT',
      actorId: ACTOR,
      page: 2,
      size: 50,
    });
  });

  it('leaves out the filters that are empty', () => {
    const query = toAuditApiQuery(base);
    for (const key of ['action', 'entityType', 'result', 'actorId', 'from', 'to'] as const) {
      expect(query[key]).toBeUndefined();
    }
  });
});

describe('hasActiveAuditFilters and dateRangeProblem', () => {
  it('has filters when any is set, but not for the page or the size', () => {
    expect(hasActiveAuditFilters(base)).toBe(false);
    expect(hasActiveAuditFilters({ ...base, page: 3, size: 50 })).toBe(false);
    expect(hasActiveAuditFilters({ ...base, actorId: ACTOR })).toBe(true);
    expect(hasActiveAuditFilters({ ...base, from: '2026-10-01' })).toBe(true);
  });

  it('warns when the range is backwards', () => {
    expect(dateRangeProblem({ ...base, from: '2026-10-08', to: '2026-10-01' })).toContain(
      'posterior',
    );
    expect(dateRangeProblem({ ...base, from: '2026-10-01', to: '2026-10-08' })).toBeNull();
    expect(dateRangeProblem({ ...base, from: '2026-10-01', to: '2026-10-01' })).toBeNull();
    expect(dateRangeProblem({ ...base, from: '2026-10-08' })).toBeNull();
  });
});
