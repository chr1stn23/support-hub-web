import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { ACCESS } from '@core/auth/access';
import { authGuard, guestGuard, roleGuard } from '@core/auth/guards';
import { unsavedChangesGuard } from '@core/auth/unsaved-changes.guard';

const placeholder = () =>
  import('./features/placeholder/placeholder-page').then((m) => m.PlaceholderPage);

const designRoutes: Routes = [
  {
    path: 'design/tokens',
    title: 'Tokens de diseño',
    loadComponent: () => import('./features/design/tokens-page').then((m) => m.TokensPage),
  },
  {
    path: 'design/components',
    title: 'Catálogo de componentes',
    loadComponent: () => import('./features/design/components-page').then((m) => m.ComponentsPage),
  },
];

export const routes: Routes = [
  ...(isDevMode() ? designRoutes : []),

  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Iniciar sesión',
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'resumen' },
      {
        path: 'resumen',
        title: 'Resumen',
        loadComponent: placeholder,
        data: { heading: 'Resumen', description: 'El estado de la operación de un vistazo.' },
      },
      {
        path: 'tickets',
        title: 'Tickets',
        loadComponent: () =>
          import('./features/tickets/ticket-list-page').then((m) => m.TicketListPage),
        data: { heading: 'Tickets', description: 'Solicitudes de soporte y su estado.' },
      },
      {
        path: 'tickets/nuevo',
        title: 'Nuevo ticket',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/tickets/ticket-create-page').then((m) => m.TicketCreatePage),
      },
      {
        path: 'tickets/:id',
        title: 'Ticket',
        loadComponent: () =>
          import('./features/tickets/ticket-detail-page').then((m) => m.TicketDetailPage),
      },
      {
        path: 'mis-equipos',
        title: 'Mis equipos',
        loadComponent: () => import('./features/assets/my-assets-page').then((m) => m.MyAssetsPage),
        data: { heading: 'Mis equipos', description: 'Los equipos que tienes asignados.' },
      },
      {
        path: 'activos',
        canActivate: [roleGuard(...ACCESS.inventory)],
        title: 'Inventario',
        loadComponent: () =>
          import('./features/assets/asset-list-page').then((m) => m.AssetListPage),
        data: {
          heading: 'Inventario',
          description: 'Equipos de la organización y quién los tiene.',
        },
      },
      {
        path: 'activos/:id',
        canActivate: [roleGuard(...ACCESS.inventory)],
        title: 'Equipo',
        loadComponent: () =>
          import('./features/assets/asset-detail-page').then((m) => m.AssetDetailPage),
        data: { heading: 'Detalle del equipo' },
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard(...ACCESS.admin)],
        title: 'Usuarios',
        loadComponent: () => import('./features/users/user-list-page').then((m) => m.UserListPage),
      },
      {
        path: 'usuarios/:id',
        canActivate: [roleGuard(...ACCESS.admin)],
        title: 'Usuario',
        loadComponent: () =>
          import('./features/users/user-detail-page').then((m) => m.UserDetailPage),
      },
      {
        path: 'auditoria',
        canActivate: [roleGuard(...ACCESS.admin)],
        title: 'Auditoría',
        loadComponent: () => import('./features/audit/audit-page').then((m) => m.AuditPage),
      },
      {
        path: 'notificaciones',
        title: 'Notificaciones',
        loadComponent: placeholder,
        data: { heading: 'Notificaciones' },
      },

      {
        path: 'acceso-denegado',
        title: 'Acceso denegado',
        loadComponent: () =>
          import('./features/errors/forbidden-page').then((m) => m.ForbiddenPage),
      },
      {
        path: '**',
        title: 'Página no encontrada',
        loadComponent: () => import('./features/errors/not-found-page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
