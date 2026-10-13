import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { pageRange, totalPagesOf } from './page-range';

@Component({
  selector: 'app-pagination',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="pager" aria-label="Paginación">
      <p class="range">
        @if (totalElements() === 0) {
          Sin resultados
        } @else {
          Mostrando {{ format(range().from) }}–{{ format(range().to) }} de
          {{ format(totalElements()) }}
        }
      </p>

      <div class="controls">
        @if (sizeOptions().length > 0) {
          <label class="size">
            <span>Por página</span>
            <select class="control" (change)="changeSize($event)">
              @for (option of sizeOptions(); track option) {
                <option [value]="option" [selected]="option === size()">{{ option }}</option>
              }
            </select>
          </label>
        }

        <span class="current" aria-live="polite"
          >Página {{ page() + 1 }} de {{ totalPages() }}</span
        >

        <div class="buttons">
          <button
            appButton
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Primera página"
            [disabled]="isFirst()"
            (click)="go(0)"
          >
            <app-icon name="chevrons-left" />
          </button>
          <button
            appButton
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Página anterior"
            [disabled]="isFirst()"
            (click)="go(page() - 1)"
          >
            <app-icon name="chevron-left" />
          </button>
          <button
            appButton
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Página siguiente"
            [disabled]="isLast()"
            (click)="go(page() + 1)"
          >
            <app-icon name="chevron-right" />
          </button>
          <button
            appButton
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Última página"
            [disabled]="isLast()"
            (click)="go(totalPages() - 1)"
          >
            <app-icon name="chevrons-right" />
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: `
    .pager {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-4);
    }
    .size {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }
    .size .control {
      width: auto;
      height: var(--control-h-sm);
      font-size: var(--text-sm);
    }
    .current {
      font-variant-numeric: tabular-nums;
    }
    .buttons {
      display: flex;
      gap: var(--space-1);
    }
  `,
})
export class Pagination {
  /** Página actual, empezando en 0 (igual que el backend). */
  readonly page = input.required<number>();
  readonly size = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly sizeOptions = input<readonly number[]>([10, 20, 50, 100]);

  readonly pageChange = output<number>();
  readonly sizeChange = output<number>();

  protected readonly totalPages = computed(() => totalPagesOf(this.totalElements(), this.size()));
  protected readonly range = computed(() =>
    pageRange(this.page(), this.size(), this.totalElements()),
  );
  protected readonly isFirst = computed(() => this.page() <= 0);
  protected readonly isLast = computed(() => this.page() >= this.totalPages() - 1);

  private readonly numbers = new Intl.NumberFormat('es-PE');

  protected format(value: number): string {
    return this.numbers.format(value);
  }

  protected go(target: number): void {
    const clamped = Math.min(Math.max(target, 0), this.totalPages() - 1);
    if (clamped !== this.page()) {
      this.pageChange.emit(clamped);
    }
  }

  protected changeSize(event: Event): void {
    this.sizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
