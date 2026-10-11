import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-placeholder-page',
  imports: [RouterLink],
  template: `
    <main style="max-width: 40rem; margin: 0 auto; padding: var(--space-8) var(--space-6)">
      <h1>{{ heading() }}</h1>
      <p>Hola, {{ auth.user()?.fullName }}. Tienes acceso a esta ruta.</p>
      <p><a routerLink="/dev/session">Volver</a></p>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPage {
  protected readonly auth = inject(AuthService);
  /** Llega desde route.data gracias a withComponentInputBinding. */
  readonly heading = input('');
}
