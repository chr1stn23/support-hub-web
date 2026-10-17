import { parseSort, SortState, toSortParam } from '@shared/ui';
import { DashboardSummary, TicketPriority, TicketStatus } from '@core/api/models';
import { TicketListQuery } from '@core/api/tickets.api';
import { isUuid, positiveInt } from '@shared/util/list-params';

export type TicketView =
  'abiertos' | 'sin-asignar' | 'mios' | 'prioridad-alta' | 'resueltos' | 'todos';

export interface ViewDefinition {
  readonly id: TicketView;
  readonly label: string;
  /** Solo para quien trabaja la cola completa (AGENT y ADMIN). */
  readonly staffOnly?: boolean;
}

export const VIEWS: readonly ViewDefinition[] = [
  { id: 'abiertos', label: 'Abiertos' },
  { id: 'sin-asignar', label: 'Sin asignar' },
  { id: 'mios', label: 'Asignados a mí', staffOnly: true },
  { id: 'prioridad-alta', label: 'Prioridad alta' },
  { id: 'resueltos', label: 'Resueltos' },
  { id: 'todos', label: 'Todos' },
];

export const DEFAULT_VIEW: TicketView = 'abiertos';
export const DEFAULT_SIZE = 20;
export const SIZE_OPTIONS: readonly number[] = [10, 20, 50, 100];
export const DEFAULT_SORT: SortState = { property: 'createdAt', direction: 'desc' };
export const SORTABLE_FIELDS: readonly string[] = ['ticketCode', 'title', 'priority', 'createdAt'];
export const MAX_SEARCH_LENGTH = 100;

const OPEN_STATUSES: readonly TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING'];
const HIGH_PRIORITIES: readonly TicketPriority[] = ['HIGH', 'CRITICAL'];
const PRIORITIES: readonly TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function viewsFor(canViewAll: boolean): ViewDefinition[] {
  return VIEWS.filter((view) => canViewAll || !view.staffOnly);
}

/** Estado de la lista tal como se entiende en la pantalla. */
export interface ListState {
  readonly view: TicketView;
  readonly search: string;
  readonly categoryId: string;
  readonly priority: TicketPriority | '';
  /** Desde 0 (en la URL empieza en 1). */
  readonly page: number;
  readonly size: number;
  readonly sort: SortState;
}

/** Los parámetros de la URL, tal cual llegan: todo texto, todo opcional, nada de fiar. */
export interface RawListParams {
  vista?: string;
  buscar?: string;
  categoria?: string;
  prioridad?: string;
  pagina?: string;
  tamano?: string;
  orden?: string;
}

/** Convierte lo que haya en la URL en un estado válido; lo que no entiende, lo ignora. */
export function parseListState(raw: RawListParams, canViewAll: boolean): ListState {
  const allowed = viewsFor(canViewAll);
  const view = allowed.find((v) => v.id === raw.vista)?.id ?? DEFAULT_VIEW;

  const size = positiveInt(raw.tamano, DEFAULT_SIZE);
  const parsedSort = parseSort(raw.orden);

  return {
    view,
    search: (raw.buscar ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
    categoryId: isUuid(raw.categoria) ? raw.categoria : '',
    priority: PRIORITIES.find((p) => p === raw.prioridad) ?? '',
    page: positiveInt(raw.pagina, 1) - 1,
    size: SIZE_OPTIONS.includes(size) ? size : DEFAULT_SIZE,
    sort: parsedSort && SORTABLE_FIELDS.includes(parsedSort.property) ? parsedSort : DEFAULT_SORT,
  };
}

/** Lo contrario: los parámetros de la URL, SIN los que valen lo mismo que el valor por defecto. */
export function toUrlParams(state: ListState): Record<string, string> {
  const params: Record<string, string> = {};
  if (state.view !== DEFAULT_VIEW) params['vista'] = state.view;
  if (state.search) params['buscar'] = state.search;
  if (state.categoryId) params['categoria'] = state.categoryId;
  if (state.priority && state.view !== 'prioridad-alta') params['prioridad'] = state.priority;
  if (state.page > 0) params['pagina'] = String(state.page + 1);
  if (state.size !== DEFAULT_SIZE) params['tamano'] = String(state.size);
  if (toSortParam(state.sort) !== toSortParam(DEFAULT_SORT))
    params['orden'] = toSortParam(state.sort);
  return params;
}

/** Lo que se le pide al backend. La vista decide los estados; el resto son filtros adicionales. */
export function toApiQuery(state: ListState, meId: string): TicketListQuery {
  const base = {
    page: state.page,
    size: state.size,
    sort: toSortParam(state.sort),
    categoryId: state.categoryId || undefined,
    search: state.search || undefined,
  };
  const priorities: readonly TicketPriority[] = state.priority ? [state.priority] : [];

  switch (state.view) {
    case 'abiertos':
      return { ...base, statuses: OPEN_STATUSES, priorities };
    case 'sin-asignar':
      return { ...base, statuses: ['OPEN'], priorities, unassigned: true };
    case 'mios':
      return { ...base, statuses: ['IN_PROGRESS', 'WAITING'], priorities, assignedTo: meId };
    case 'prioridad-alta':
      return { ...base, statuses: OPEN_STATUSES, priorities: HIGH_PRIORITIES };
    case 'resueltos':
      return { ...base, statuses: ['RESOLVED'], priorities };
    case 'todos':
      return { ...base, statuses: [], priorities };
  }
}

export function hasActiveFilters(state: ListState): boolean {
  return (
    state.search !== '' ||
    state.categoryId !== '' ||
    (state.priority !== '' && state.view !== 'prioridad-alta')
  );
}

/** El número de cada pestaña, tomado del resumen. null si todavía no se sabe. */
export function viewCount(view: TicketView, summary: DashboardSummary | null): number | null {
  if (!summary) return null;
  switch (view) {
    case 'abiertos':
      return summary.tickets.open;
    case 'sin-asignar':
      return summary.tickets.unassigned;
    case 'mios':
      return summary.mine?.assignedOpen ?? null;
    case 'prioridad-alta':
      return summary.tickets.highPriorityOpen;
    case 'resueltos':
      return summary.tickets.byStatus.RESOLVED;
    case 'todos':
      return Object.values(summary.tickets.byStatus).reduce((sum, n) => sum + n, 0);
  }
}
