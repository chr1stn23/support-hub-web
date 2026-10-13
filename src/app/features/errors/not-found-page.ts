import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, EmptyState } from '@shared/ui';

@Component({
  selector: 'app-not-found-page',
  imports: [EmptyState, Button, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-empty-state
      icon="search"
      title="No encontramos esta página"
      description="Puede que la dirección esté mal escrita o que la página ya no exista."
    >
      <a appButton variant="primary" routerLink="/">Volver al inicio</a>
    </app-empty-state>
  `,
})
export class NotFoundPage {}
