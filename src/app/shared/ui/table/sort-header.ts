/* eslint-disable @angular-eslint/component-selector --
   Componente de atributo a propósito: se aplica a un <th> nativo y conserva la semántica de la tabla. */
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';
import { SortDirection, SortState, nextSort } from './sort';

@Component({
  selector: 'th[appSortHeader]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.aria-sort]': 'ariaSort()' },
  template: `
    <button type="button" class="sort" (click)="toggle()">
      <span><ng-content /></span>
      <app-icon [name]="icon()" [size]="14" />
    </button>
  `,
  styles: `
    .sort {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 0;
      font: inherit;
      color: inherit;
      background: none;
      border: 0;
      cursor: pointer;
    }
    .sort:hover {
      color: var(--color-text);
    }
    :host([aria-sort='ascending']) .sort,
    :host([aria-sort='descending']) .sort {
      color: var(--color-text);
    }
    :host(.cell-num) .sort {
      margin-left: auto;
    }
  `,
})
export class SortHeader {
  readonly key = input.required<string>({ alias: 'appSortHeader' });
  readonly sort = input<SortState | null>(null);
  readonly firstDirection = input<SortDirection>('asc');
  readonly sortChange = output<SortState>();

  private readonly direction = computed<SortDirection | null>(() => {
    const sort = this.sort();
    return sort && sort.property === this.key() ? sort.direction : null;
  });

  protected readonly ariaSort = computed(() => {
    const direction = this.direction();
    if (!direction) return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
  });

  protected readonly icon = computed<IconName>(() => {
    const direction = this.direction();
    if (!direction) return 'arrows-up-down';
    return direction === 'asc' ? 'arrow-up' : 'arrow-down';
  });

  protected toggle(): void {
    this.sortChange.emit(nextSort(this.sort(), this.key(), this.firstDirection()));
  }
}
