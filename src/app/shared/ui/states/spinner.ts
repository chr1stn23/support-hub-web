import { ChangeDetectionStrategy, Component, input, numberAttribute } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-spinner',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  template: `
    <app-icon name="loader" [size]="size()" spin />
    <span class="sr-only">{{ label() }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      color: var(--color-text-secondary);
    }
  `,
})
export class Spinner {
  readonly size = input(20, { transform: numberAttribute });
  readonly label = input('Cargando');
}
