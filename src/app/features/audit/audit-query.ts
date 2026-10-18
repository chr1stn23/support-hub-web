import type { AuditQuery } from '@core/api/audit.api';
import type { AuditAction, AuditEntityType, AuditResult } from '@core/api/models';
import { isUuid, positiveInt } from '@shared/util/list-params';
import { AUDIT_ACTIONS } from './audit-text';

export type AuditAreaId = 'ticket' | 'equipo' | 'usuario' | 'seguridad';
export type AuditResultId = 'exito' | 'fallo';

export const AUDIT_AREAS: readonly {
  readonly id: AuditAreaId;
  readonly label: string;
  readonly entityType: AuditEntityType;
}[] = [
  { id: 'ticket', label: 'Tickets', entityType: 'TICKET' },
  { id: 'equipo', label: 'Equipos', entityType: 'ASSET' },
  { id: 'usuario', label: 'Usuarios', entityType: 'USER' },
  { id: 'seguridad', label: 'Seguridad', entityType: 'SECURITY' },
];

export const AUDIT_RESULTS: readonly {
  readonly id: AuditResultId;
  readonly label: string;
  readonly result: AuditResult;
}[] = [
  { id: 'exito', label: 'Correcto', result: 'SUCCESS' },
  { id: 'fallo', label: 'Fallido', result: 'FAILURE' },
];

export const DEFAULT_AUDIT_SIZE = 20;
export const AUDIT_SIZE_OPTIONS: readonly number[] = [10, 20, 50, 100];

export interface AuditListState {
  readonly action: AuditAction | '';
  readonly area: AuditAreaId | '';
  readonly result: AuditResultId | '';
  readonly actorId: string;
  /** Un día, "AAAA-MM-DD", o vacío. */
  readonly from: string;
  readonly to: string;
  /** Desde 0 (en la URL empieza en 1). */
  readonly page: number;
  readonly size: number;
}

export interface RawAuditParams {
  accion?: string;
  area?: string;
  resultado?: string;
  persona?: string;
  desde?: string;
  hasta?: string;
  pagina?: string;
  tamano?: string;
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** El día, si existe de verdad ("2026-02-30" no existe); si no, vacío. */
export function validDay(value: string | undefined): string {
  const match = value ? DAY.exec(value) : null;
  if (!match) return '';
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? value!
    : '';
}

/** El inicio de ese día en la zona horaria de quien mira, como instante ISO. */
export function startOfDayIso(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 0, 0, 0, 0).toISOString();
}

/** El final de ese día en la zona horaria de quien mira, como instante ISO. */
export function endOfDayIso(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 23, 59, 59, 999).toISOString();
}

export function parseAuditState(raw: RawAuditParams): AuditListState {
  const size = positiveInt(raw.tamano, DEFAULT_AUDIT_SIZE);
  return {
    action: AUDIT_ACTIONS.find((action) => action === raw.accion) ?? '',
    area: AUDIT_AREAS.find((area) => area.id === raw.area)?.id ?? '',
    result: AUDIT_RESULTS.find((result) => result.id === raw.resultado)?.id ?? '',
    actorId: isUuid(raw.persona) ? raw.persona : '',
    from: validDay(raw.desde),
    to: validDay(raw.hasta),
    page: positiveInt(raw.pagina, 1) - 1,
    size: AUDIT_SIZE_OPTIONS.includes(size) ? size : DEFAULT_AUDIT_SIZE,
  };
}

export function toAuditUrlParams(state: AuditListState): Record<string, string> {
  const params: Record<string, string> = {};
  if (state.action) params['accion'] = state.action;
  if (state.area) params['area'] = state.area;
  if (state.result) params['resultado'] = state.result;
  if (state.actorId) params['persona'] = state.actorId;
  if (state.from) params['desde'] = state.from;
  if (state.to) params['hasta'] = state.to;
  if (state.page > 0) params['pagina'] = String(state.page + 1);
  if (state.size !== DEFAULT_AUDIT_SIZE) params['tamano'] = String(state.size);
  return params;
}

export function toAuditApiQuery(state: AuditListState): AuditQuery {
  return {
    page: state.page,
    size: state.size,
    action: state.action || undefined,
    entityType: AUDIT_AREAS.find((area) => area.id === state.area)?.entityType,
    result: AUDIT_RESULTS.find((result) => result.id === state.result)?.result,
    actorId: state.actorId || undefined,
    from: state.from ? startOfDayIso(state.from) : undefined,
    to: state.to ? endOfDayIso(state.to) : undefined,
  };
}

export function hasActiveAuditFilters(state: AuditListState): boolean {
  return (
    state.action !== '' ||
    state.area !== '' ||
    state.result !== '' ||
    state.actorId !== '' ||
    state.from !== '' ||
    state.to !== ''
  );
}

/** Avisa de un rango que no puede dar resultados. */
export function dateRangeProblem(state: AuditListState): string | null {
  return state.from && state.to && state.from > state.to
    ? 'La fecha «Desde» es posterior a «Hasta»: no habrá resultados.'
    : null;
}
