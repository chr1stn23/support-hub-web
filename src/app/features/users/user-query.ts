import type { Role } from '@core/api/models';
import type { UserListQuery } from '@core/api/users.api';
import { ROLE_ORDER } from '@shared/domain';
import { SortState, parseSort, toSortParam } from '@shared/ui';
import { positiveInt } from '@shared/util/list-params';

export type UserView = 'activos' | 'inactivos' | 'todos';

export interface UserViewDefinition {
  readonly id: UserView;
  readonly label: string;
  /** null = sin filtrar por estado. */
  readonly active: boolean | null;
}

export const USER_VIEWS: readonly UserViewDefinition[] = [
  { id: 'activos', label: 'Activos', active: true },
  { id: 'inactivos', label: 'Inactivos', active: false },
  { id: 'todos', label: 'Todos', active: null },
];

export const DEFAULT_USER_VIEW: UserView = 'activos';
export const DEFAULT_USER_SIZE = 20;
export const USER_SIZE_OPTIONS: readonly number[] = [10, 20, 50, 100];
export const DEFAULT_USER_SORT: SortState = { property: 'fullName', direction: 'asc' };
export const USER_SORTABLE_FIELDS: readonly string[] = ['fullName', 'email', 'createdAt'];
export const MAX_USER_SEARCH_LENGTH = 100;

export interface UserListState {
  readonly view: UserView;
  readonly role: Role | '';
  readonly search: string;
  readonly page: number;
  readonly size: number;
  readonly sort: SortState;
}

export interface RawUserParams {
  estado?: string;
  rol?: string;
  buscar?: string;
  pagina?: string;
  tamano?: string;
  orden?: string;
}

export function parseUserListState(raw: RawUserParams): UserListState {
  const size = positiveInt(raw.tamano, DEFAULT_USER_SIZE);
  const sort = parseSort(raw.orden);
  return {
    view: USER_VIEWS.find((view) => view.id === raw.estado)?.id ?? DEFAULT_USER_VIEW,
    role: ROLE_ORDER.find((role) => role === raw.rol) ?? '',
    search: (raw.buscar ?? '').trim().slice(0, MAX_USER_SEARCH_LENGTH),
    page: positiveInt(raw.pagina, 1) - 1,
    size: USER_SIZE_OPTIONS.includes(size) ? size : DEFAULT_USER_SIZE,
    sort: sort && USER_SORTABLE_FIELDS.includes(sort.property) ? sort : DEFAULT_USER_SORT,
  };
}

export function toUserUrlParams(state: UserListState): Record<string, string> {
  const params: Record<string, string> = {};
  if (state.view !== DEFAULT_USER_VIEW) params['estado'] = state.view;
  if (state.role) params['rol'] = state.role;
  if (state.search) params['buscar'] = state.search;
  if (state.page > 0) params['pagina'] = String(state.page + 1);
  if (state.size !== DEFAULT_USER_SIZE) params['tamano'] = String(state.size);
  if (toSortParam(state.sort) !== toSortParam(DEFAULT_USER_SORT))
    params['orden'] = toSortParam(state.sort);
  return params;
}

export function toUserApiQuery(state: UserListState): UserListQuery {
  const active = USER_VIEWS.find((view) => view.id === state.view)?.active ?? undefined;
  return {
    page: state.page,
    size: state.size,
    sort: toSortParam(state.sort),
    active,
    role: state.role || undefined,
    search: state.search || undefined,
  };
}

export function hasActiveUserFilters(state: UserListState): boolean {
  return state.search !== '' || state.role !== '';
}
