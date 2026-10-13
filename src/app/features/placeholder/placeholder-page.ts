import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmptyState, PageHeader } from '@shared/ui';

@Component({
  selector: 'app-placeholder-page',
  imports: [PageHeader, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="heading()" [description]="description()" />
    <app-empty-state
      icon="clipboard-list"
      title="Esta pantalla aún está en construcción"
      description="La navegación y los permisos ya funcionan. El contenido llega en los próximos pasos."
    />
  `,
})
export class PlaceholderPage {
  /** Llegan desde route.data gracias a withComponentInputBinding. */
  readonly heading = input('');
  readonly description = input<string | null>(null);
}
