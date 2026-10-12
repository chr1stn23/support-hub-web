import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TicketPriority } from '@core/api/models';
import { Icon } from '@shared/ui';
import { TICKET_PRIORITY } from './labels';

@Component({
  selector: 'app-priority',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': "showLabel() ? null : 'img'",
    '[attr.aria-label]': "showLabel() ? null : 'Prioridad ' + meta().label.toLowerCase()",
    '[attr.title]': 'showLabel() ? null : meta().label',
  },
  template: `
    <app-icon [name]="meta().icon" [size]="16" [style.color]="meta().color" />
    @if (showLabel()) {
      <span class="label">{{ meta().label }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-sm);
      color: var(--color-text);
    }
  `,
})
export class PriorityBadge {
  readonly priority = input.required<TicketPriority>();
  /** Con false solo se ve el icono (para filas muy densas); el nombre queda en aria-label y title. */
  readonly showLabel = input(true, { transform: booleanAttribute });

  protected readonly meta = computed(() => TICKET_PRIORITY[this.priority()]);
}
