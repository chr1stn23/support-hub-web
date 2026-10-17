import type { DashboardAssetMetrics } from '@core/api/models';
import {
  AssetListState,
  DEFAULT_ASSET_SORT,
  assetViewCount,
  hasActiveAssetFilters,
  parseAssetListState,
  toAssetApiQuery,
  toAssetUrlParams,
} from './asset-query';

const TYPE = '0c9d6e0e-7b1d-4c0a-9f0e-3a6f5f0c1b11';

const base: AssetListState = {
  view: 'todos',
  search: '',
  typeId: '',
  page: 0,
  size: 20,
  sort: DEFAULT_ASSET_SORT,
};

describe('parseAssetListState', () => {
  it('uses the defaults when the URL has nothing', () => {
    expect(parseAssetListState({})).toEqual(base);
  });

  it('reads every parameter (the page starts at 1 in the URL)', () => {
    expect(
      parseAssetListState({
        estado: 'mantenimiento',
        buscar: ' dell ',
        tipo: TYPE,
        pagina: '3',
        tamano: '50',
        orden: 'brand,desc',
      }),
    ).toEqual({
      view: 'mantenimiento',
      search: 'dell',
      typeId: TYPE,
      page: 2,
      size: 50,
      sort: { property: 'brand', direction: 'desc' },
    });
  });

  it.each([
    ['pagina', 'abc'],
    ['pagina', '0'],
    ['tamano', '999'],
    ['tamano', 'abc'],
    ['estado', 'inventado'],
    ['tipo', 'no-es-un-uuid'],
    ['orden', 'serialNumber,asc'],
    ['orden', ',desc'],
  ])('ignores %s=%s and falls back to the default', (key, value) => {
    expect(parseAssetListState({ [key]: value })).toEqual(base);
  });

  it('caps the search text', () => {
    expect(parseAssetListState({ buscar: 'x'.repeat(500) }).search).toHaveLength(100);
  });
});

describe('toAssetUrlParams', () => {
  it('writes nothing for the default state, so the clean URL stays clean', () => {
    expect(toAssetUrlParams(base)).toEqual({});
  });

  it('writes only what is not the default, with the page starting at 1', () => {
    expect(
      toAssetUrlParams({ ...base, view: 'baja', search: 'dell', typeId: TYPE, page: 1, size: 10 }),
    ).toEqual({
      estado: 'baja',
      buscar: 'dell',
      tipo: TYPE,
      pagina: '2',
      tamano: '10',
    });
  });

  it('writes the sort only when it differs from the default', () => {
    expect(toAssetUrlParams({ ...base, sort: { property: 'model', direction: 'asc' } })).toEqual({
      orden: 'model,asc',
    });
  });

  it('round-trips with parseAssetListState', () => {
    const state: AssetListState = {
      view: 'asignados',
      search: 'laptop',
      typeId: TYPE,
      page: 4,
      size: 100,
      sort: { property: 'model', direction: 'desc' },
    };
    expect(parseAssetListState(toAssetUrlParams(state))).toEqual(state);
  });
});

describe('toAssetApiQuery', () => {
  it.each([
    ['todos', undefined],
    ['disponibles', 'AVAILABLE'],
    ['asignados', 'ASSIGNED'],
    ['mantenimiento', 'MAINTENANCE'],
    ['baja', 'RETIRED'],
  ] as const)('the "%s" tab asks for status %s', (view, status) => {
    expect(toAssetApiQuery({ ...base, view }).status).toBe(status);
  });

  it('adds the filters, the page, the size and the sort', () => {
    expect(
      toAssetApiQuery({
        ...base,
        search: 'dell',
        typeId: TYPE,
        page: 2,
        size: 50,
        sort: { property: 'brand', direction: 'desc' },
      }),
    ).toEqual({
      page: 2,
      size: 50,
      sort: 'brand,desc',
      status: undefined,
      assetTypeId: TYPE,
      search: 'dell',
    });
  });

  it('leaves out the filters that are empty', () => {
    const query = toAssetApiQuery(base);
    expect(query.search).toBeUndefined();
    expect(query.assetTypeId).toBeUndefined();
  });
});

describe('hasActiveAssetFilters', () => {
  it('is false for the plain state and for a tab or page change', () => {
    expect(hasActiveAssetFilters(base)).toBe(false);
    expect(hasActiveAssetFilters({ ...base, view: 'baja', page: 3 })).toBe(false);
  });

  it('is true with a search or a type', () => {
    expect(hasActiveAssetFilters({ ...base, search: 'x' })).toBe(true);
    expect(hasActiveAssetFilters({ ...base, typeId: TYPE })).toBe(true);
  });
});

describe('assetViewCount', () => {
  const assets: DashboardAssetMetrics = {
    total: 40,
    byStatus: { AVAILABLE: 12, ASSIGNED: 20, MAINTENANCE: 5, RETIRED: 3 },
    byType: [],
  };

  it('takes each number from the summary', () => {
    expect(assetViewCount('todos', assets)).toBe(40);
    expect(assetViewCount('disponibles', assets)).toBe(12);
    expect(assetViewCount('asignados', assets)).toBe(20);
    expect(assetViewCount('mantenimiento', assets)).toBe(5);
    expect(assetViewCount('baja', assets)).toBe(3);
  });

  it('counts a status that is missing from the summary as 0', () => {
    expect(assetViewCount('baja', { total: 7, byStatus: { AVAILABLE: 7 }, byType: [] })).toBe(0);
  });

  it('is null until the summary is known, or when the role does not receive it', () => {
    expect(assetViewCount('todos', null)).toBeNull();
    expect(assetViewCount('todos', undefined)).toBeNull();
  });
});
