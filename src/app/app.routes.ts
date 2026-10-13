import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { ACCESS } from '@core/auth/access';
import { authGuard, guestGuard, roleGuard } from '@core/auth/guards';

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
        loadComponent: placeholder,
        data: { heading: 'Tickets', description: 'Solicitudes de soporte y su estado.' },
      },
      {
        path: 'tickets/nuevo',
        title: 'Nuevo ticket',
        loadComponent: placeholder,
        data: { heading: 'Nuevo ticket', description: 'Cuéntanos qué necesitas.' },
      },
      {
        path: 'tickets/:id',
        title: 'Ticket',
        loadComponent: placeholder,
        data: { heading: 'Detalle del ticket' },
      },
      {
        path: 'mis-equipos',
        title: 'Mis equipos',
        loadComponent: placeholder,
        data: { heading: 'Mis equipos', description: 'Los equipos que tienes asignados.' },
      },
      {
        path: 'activos',
        canActivate: [roleGuard(...ACCESS.inventory)],
        title: 'Inventario',
        loadComponent: placeholder,
        data: {
          heading: 'Inventario',
          description: 'Equipos de la organización y quién los tiene.',
        },
      },
      {
        path: 'activos/:id',
        canActivate: [roleGuard(...ACCESS.inventory)],
        title: 'Equipo',
        loadComponent: placeholder,
        data: { heading: 'Detalle del equipo' },
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard(...ACCESS.admin)],
        title: 'Usuarios',
        loadComponent: placeholder,
        data: { heading: 'Usuarios', description: 'Cuentas, roles y estado de acceso.' },
      },
      {
        path: 'auditoria',
        canActivate: [roleGuard(...ACCESS.admin)],
        title: 'Auditoría',
        loadComponent: placeholder,
        data: { heading: 'Auditoría', description: 'Registro de acciones sensibles.' },
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
