import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';

@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @for (line of lineList(); track line) {
      <span
        class="bar"
        [class.bar--round]="round()"
        [style.width]="isLast(line) ? '60%' : width()"
        [style.height]="height()"
      ></span>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-2);
    }
    .bar {
      display: block;
      background: linear-gradient(
        90deg,
        var(--slate-100) 25%,
        var(--slate-200) 50%,
        var(--slate-100) 75%
      );
      background-size: 200% 100%;
      border-radius: var(--radius-sm);
      animation: shimmer 1.4s ease-in-out infinite;
    }
    .bar--round {
      border-radius: var(--radius-full);
    }
    @keyframes shimmer {
      from {
        background-position: 200% 0;
      }
      to {
        background-position: -200% 0;
      }
    }
  `,
})
export class Skeleton {
  readonly lines = input(1, { transform: numberAttribute });
  readonly height = input('0.875rem');
  readonly width = input('100%');
  /** Para avatares y círculos. */
  readonly round = input(false, { transform: booleanAttribute });

  protected readonly lineList = computed(() =>
    Array.from({ length: Math.max(1, this.lines()) }, (_, i) => i),
  );

  /** Con varias líneas, la última es más corta, como un párrafo real. */
  protected isLast(line: number): boolean {
    return this.lines() > 1 && line === this.lines() - 1;
  }
}
