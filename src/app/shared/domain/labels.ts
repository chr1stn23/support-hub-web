import { AssetStatus, Role, TicketPriority, TicketStatus } from '@core/api/models';
import { IconName, Tone } from '@shared/ui';

export interface StatusMeta {
  readonly label: string;
  readonly tone: Tone;
  /** Estado "anulado": borde punteado y texto tachado. */
  readonly voided?: boolean;
}

export const TICKET_STATUS: Record<TicketStatus, StatusMeta> = {
  OPEN: { label: 'Sin asignar', tone: 'neutral' },
  IN_PROGRESS: { label: 'En curso', tone: 'accent' },
  WAITING: { label: 'Esperando', tone: 'warning' },
  RESOLVED: { label: 'Resuelto', tone: 'success' },
  CLOSED: { label: 'Cerrado', tone: 'neutral-soft' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral', voided: true },
};

export const ASSET_STATUS: Record<AssetStatus, StatusMeta> = {
  AVAILABLE: { label: 'Disponible', tone: 'success' },
  ASSIGNED: { label: 'Asignado', tone: 'accent' },
  MAINTENANCE: { label: 'En mantenimiento', tone: 'warning' },
  RETIRED: { label: 'De baja', tone: 'neutral', voided: true },
};

export interface PriorityMeta {
  readonly label: string;
  readonly icon: IconName;
  /** Variable CSS del color del icono. */
  readonly color: string;
}

export const TICKET_PRIORITY: Record<TicketPriority, PriorityMeta> = {
  LOW: { label: 'Baja', icon: 'chevron-down', color: 'var(--priority-low)' },
  MEDIUM: { label: 'Media', icon: 'equal', color: 'var(--priority-medium)' },
  HIGH: { label: 'Alta', icon: 'chevron-up', color: 'var(--priority-high)' },
  CRITICAL: { label: 'Crítica', icon: 'chevrons-up', color: 'var(--priority-critical)' },
};

/** Orden en que se presentan en filtros y selectores. */
export const TICKET_STATUS_ORDER: readonly TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
];

export const ASSET_STATUS_ORDER: readonly AssetStatus[] = [
  'AVAILABLE',
  'ASSIGNED',
  'MAINTENANCE',
  'RETIRED',
];

/** De menor a mayor gravedad. */
export const PRIORITY_ORDER: readonly TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  AGENT: 'Agente',
  ASSET_MANAGER: 'Gestor de activos',
  USER: 'Usuario',
};

export const ROLE_ORDER: readonly Role[] = ['ADMIN', 'AGENT', 'ASSET_MANAGER', 'USER'];

export function sortedRoleLabels(roles: readonly Role[]): string[] {
  return ROLE_ORDER.filter((role) => roles.includes(role)).map((role) => ROLE_LABEL[role]);
}
