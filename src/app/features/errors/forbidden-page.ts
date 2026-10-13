import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, EmptyState } from '@shared/ui';

@Component({
  selector: 'app-forbidden-page',
  imports: [EmptyState, Button, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-empty-state
      icon="alert-triangle"
      title="No tienes acceso a esta sección"
      description="Tu rol no incluye este módulo. Si crees que es un error, consulta con un administrador."
    >
      <a appButton variant="primary" routerLink="/">Volver al inicio</a>
    </app-empty-state>
  `,
})
export class ForbiddenPage {}
