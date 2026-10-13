import { Role } from '@core/api/models';
import { ACCESS } from '@core/auth/access';
import { IconName } from '@shared/ui';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: IconName;
  /** Sin roles: cualquier persona con sesión. */
  readonly roles?: readonly Role[];
}

export interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Trabajo',
    items: [
      { label: 'Resumen', path: '/resumen', icon: 'layout-dashboard' },
      { label: 'Tickets', path: '/tickets', icon: 'ticket' },
    ],
  },
  {
    label: 'Equipos',
    items: [
      { label: 'Mis equipos', path: '/mis-equipos', icon: 'laptop' },
      { label: 'Inventario', path: '/activos', icon: 'box', roles: ACCESS.inventory },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Usuarios', path: '/usuarios', icon: 'users', roles: ACCESS.admin },
      { label: 'Auditoría', path: '/auditoria', icon: 'clipboard-list', roles: ACCESS.admin },
    ],
  },
];

/** El menú de una persona: solo lo que su rol permite, y sin grupos vacíos. */
export function navGroupsFor(roles: readonly Role[]): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter(
      (item) => !item.roles || item.roles.some((role) => roles.includes(role)),
    ),
  })).filter((group) => group.items.length > 0);
}

/** "/tickets?status=OPEN#x" → "/tickets": los filtros no cuentan como cambiar de página. */
export function pathOf(url: string): string {
  return url.split(/[?#]/)[0];
}
