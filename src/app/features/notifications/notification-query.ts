import type { NotificationsQuery } from '@core/api/notifications.api';
import type { AppNotification } from '@core/api/models';
import type { IconName } from '@shared/ui';
import { positiveInt } from '@shared/util/list-params';

export type NotificationView = 'todas' | 'no-leidas';

export const NOTIFICATION_VIEWS: readonly {
  readonly id: NotificationView;
  readonly label: string;
  readonly unreadOnly: boolean;
}[] = [
  { id: 'todas', label: 'Todas', unreadOnly: false },
  { id: 'no-leidas', label: 'No leídas', unreadOnly: true },
];

export const DEFAULT_NOTIFICATION_VIEW: NotificationView = 'todas';
export const DEFAULT_NOTIFICATION_SIZE = 20;
export const NOTIFICATION_SIZE_OPTIONS: readonly number[] = [10, 20, 50];

export interface NotificationListState {
  readonly view: NotificationView;
  readonly page: number;
  readonly size: number;
}

export interface RawNotificationParams {
  vista?: string;
  pagina?: string;
  tamano?: string;
}

export function parseNotificationState(raw: RawNotificationParams): NotificationListState {
  const size = positiveInt(raw.tamano, DEFAULT_NOTIFICATION_SIZE);
  return {
    view: NOTIFICATION_VIEWS.find((view) => view.id === raw.vista)?.id ?? DEFAULT_NOTIFICATION_VIEW,
    page: positiveInt(raw.pagina, 1) - 1,
    size: NOTIFICATION_SIZE_OPTIONS.includes(size) ? size : DEFAULT_NOTIFICATION_SIZE,
  };
}

export function toNotificationUrlParams(state: NotificationListState): Record<string, string> {
  const params: Record<string, string> = {};
  if (state.view !== DEFAULT_NOTIFICATION_VIEW) params['vista'] = state.view;
  if (state.page > 0) params['pagina'] = String(state.page + 1);
  if (state.size !== DEFAULT_NOTIFICATION_SIZE) params['tamano'] = String(state.size);
  return params;
}

export function toNotificationApiQuery(state: NotificationListState): NotificationsQuery {
  const unreadOnly = NOTIFICATION_VIEWS.find((view) => view.id === state.view)?.unreadOnly ?? false;
  return { page: state.page, size: state.size, unreadOnly };
}

/**
 * A dónde lleva una notificación. Quien no ve el inventario (una persona usuaria) recibe avisos de equipos,
 * pero no puede abrir su detalle: va a "Mis equipos".
 */
export function notificationLink(
  notification: Pick<AppNotification, 'ticketId' | 'assetId'>,
  canSeeInventory: boolean,
): string[] | null {
  if (notification.ticketId) return ['/tickets', notification.ticketId];
  if (notification.assetId)
    return canSeeInventory ? ['/activos', notification.assetId] : ['/mis-equipos'];
  return null;
}

export function notificationIcon(type: string): IconName {
  if (type.startsWith('TICKET_')) return 'ticket';
  if (type.startsWith('ASSET_')) return 'laptop';
  return 'bell';
}
