import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'design/tokens',
    loadComponent: () => import('./features/design/tokens-page').then((m) => m.TokensPage),
  },
  { path: '**', redirectTo: 'design/tokens' },
];
