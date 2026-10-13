import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/** Para listas sin resultados. El contenido proyectado son las acciones (por ejemplo, "Crear ticket"). */
@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (icon(); as name) {
      <app-icon class="icon" [name]="name" [size]="28" />
    }
    <h3 class="title">{{ title() }}</h3>
    @if (description(); as text) {
      <p class="description">{{ text }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-10) var(--space-6);
      text-align: center;
    }
    .icon {
      color: var(--slate-500);
    }
    .title {
      font-size: var(--text-md);
    }
    .description {
      max-width: 28rem;
      color: var(--color-text-secondary);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }
    .actions:empty {
      display: none;
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly icon = input<IconName | null>('inbox');
}
