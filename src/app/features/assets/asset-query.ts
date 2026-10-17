import { AssetStatus, DashboardAssetMetrics } from '@core/api/models';
import { parseSort, SortState, toSortParam } from '@shared/ui';
import { isUuid, positiveInt } from '@shared/util/list-params';
import { AssetListQuery } from '@core/api/assets.api';

export type AssetView = 'todos' | 'disponibles' | 'asignados' | 'mantenimiento' | 'baja';

export interface AssetViewDefinition {
  readonly id: AssetView;
  readonly label: string;
  readonly status: AssetStatus | null;
}

export const ASSET_VIEWS: readonly AssetViewDefinition[] = [
  { id: 'todos', label: 'Todos', status: null },
  { id: 'disponibles', label: 'Disponibles', status: 'AVAILABLE' },
  { id: 'asignados', label: 'Asignados', status: 'ASSIGNED' },
  { id: 'mantenimiento', label: 'En mantenimiento', status: 'MAINTENANCE' },
  { id: 'baja', label: 'De baja', status: 'RETIRED' },
];

export const DEFAULT_ASSET_VIEW: AssetView = 'todos';
export const DEFAULT_ASSET_SIZE = 20;
export const ASSET_SIZE_OPTIONS: readonly number[] = [10, 20, 50, 100];
export const DEFAULT_ASSET_SORT: SortState = { property: 'assetTag', direction: 'asc' };
/** Las columnas ordenables de la tabla. El backend admite además las fechas de creación y de edición. */
export const ASSET_SORTABLE_FIELDS: readonly string[] = ['assetTag', 'brand', 'model'];
export const MAX_ASSET_SEARCH_LENGTH = 100;

export interface AssetListState {
  readonly view: AssetView;
  readonly search: string;
  readonly typeId: string;
  readonly page: number;
  readonly size: number;
  readonly sort: SortState;
}

// Parámetros de la URL
export interface RawAssetParams {
  estado?: string;
  buscar?: string;
  tipo?: string;
  pagina?: string;
  tamano?: string;
  orden?: string;
}

export function parseAssetListState(raw: RawAssetParams): AssetListState {
  const size = positiveInt(raw.tamano, DEFAULT_ASSET_SIZE);
  const sort = parseSort(raw.orden);
  return {
    view: ASSET_VIEWS.find((view) => view.id === raw.estado)?.id ?? DEFAULT_ASSET_VIEW,
    search: (raw.buscar ?? '').trim().slice(0, MAX_ASSET_SEARCH_LENGTH),
    typeId: isUuid(raw.tipo) ? raw.tipo : '',
    page: positiveInt(raw.pagina, 1) - 1,
    size: ASSET_SIZE_OPTIONS.includes(size) ? size : DEFAULT_ASSET_SIZE,
    sort: sort && ASSET_SORTABLE_FIELDS.includes(sort.property) ? sort : DEFAULT_ASSET_SORT,
  };
}

export function toAssetUrlParams(state: AssetListState): Record<string, string> {
  const params: Record<string, string> = {};
  if (state.view !== DEFAULT_ASSET_VIEW) params['estado'] = state.view;
  if (state.search) params['buscar'] = state.search;
  if (state.typeId) params['tipo'] = state.typeId;
  if (state.page > 0) params['pagina'] = String(state.page + 1);
  if (state.size !== DEFAULT_ASSET_SIZE) params['tamano'] = String(state.size);
  if (toSortParam(state.sort) !== toSortParam(DEFAULT_ASSET_SORT))
    params['orden'] = toSortParam(state.sort);
  return params;
}

export function toAssetApiQuery(state: AssetListState): AssetListQuery {
  const status = ASSET_VIEWS.find((view) => view.id === state.view)?.status ?? undefined;
  return {
    page: state.page,
    size: state.size,
    sort: toSortParam(state.sort),
    status,
    assetTypeId: state.typeId || undefined,
    search: state.search || undefined,
  };
}

export function hasActiveAssetFilters(state: AssetListState): boolean {
  return state.search !== '' || state.typeId !== '';
}

export function assetViewCount(
  view: AssetView,
  assets: DashboardAssetMetrics | null | undefined,
): number | null {
  if (!assets) return null;
  const status = ASSET_VIEWS.find((v) => v.id === view)?.status ?? null;
  return status === null ? assets.total : (assets.byStatus[status] ?? 0);
}
