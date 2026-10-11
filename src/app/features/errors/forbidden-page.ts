import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink],
  template: `
    <main style="max-width: 40rem; margin: 0 auto; padding: var(--space-8) var(--space-6)">
      <h1>No tienes acceso a esta sección</h1>
      <p>Tu rol no incluye este módulo. Si crees que es un error, consulta con un administrador.</p>
      <p><a routerLink="/">Volver al inicio</a></p>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {}
