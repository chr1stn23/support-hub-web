import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Título de la pantalla, descripción opcional y, a la derecha, las acciones principales (contenido proyectado). */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text">
      <h1>{{ title() }}</h1>
      @if (description(); as text) {
        <p class="description">{{ text }}</p>
      }
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }
    h1 {
      font-size: var(--text-2xl);
    }
    .description {
      margin-top: var(--space-1);
      color: var(--color-text-secondary);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .actions:empty {
      display: none;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
