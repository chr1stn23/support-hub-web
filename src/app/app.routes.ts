import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '@core/auth/guards';

const placeholder = () =>
  import('./features/design/placeholder-page').then((m) => m.PlaceholderPage);

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/design/session-page').then((m) => m.SessionPage),
  },
  {
    path: 'dev/session',
    loadComponent: () => import('./features/design/session-page').then((m) => m.SessionPage),
  },
  {
    path: 'dev/authenticated',
    canActivate: [authGuard],
    loadComponent: placeholder,
    data: { heading: 'Cualquier usuario autenticado' },
  },
  {
    path: 'dev/staff',
    canActivate: [authGuard, roleGuard('AGENT', 'ADMIN')],
    loadComponent: placeholder,
    data: { heading: 'Solo agentes y administradores' },
  },
  {
    path: 'dev/admin',
    canActivate: [authGuard, roleGuard('ADMIN')],
    loadComponent: placeholder,
    data: { heading: 'Solo administradores' },
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/errors/forbidden-page').then((m) => m.ForbiddenPage),
  },
  {
    path: 'design/tokens',
    loadComponent: () => import('./features/design/tokens-page').then((m) => m.TokensPage),
  },
  {
    path: 'design/components',
    loadComponent: () => import('./features/design/components-page').then((m) => m.ComponentsPage),
  },
  { path: '**', redirectTo: 'design/tokens' },
];
