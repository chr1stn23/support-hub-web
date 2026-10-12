import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type Tone = 'neutral' | 'neutral-soft' | 'accent' | 'warning' | 'success' | 'danger';

/** El color lo aporta la clase tone-* (estilos globales); el chip solo lo consume. */
@Component({
  selector: 'app-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'toneClass()', '[class.is-voided]': 'voided()' },
  template: `<ng-content />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 2px var(--space-2);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      line-height: 1.4;
      white-space: nowrap;
      color: var(--tone-fg);
      background: var(--tone-bg);
      border: 1px solid var(--tone-border);
      border-radius: var(--radius-sm);
    }
    :host(.is-voided) {
      border-style: dashed;
      text-decoration: line-through;
    }
  `,
})
export class Chip {
  readonly tone = input<Tone>('neutral');
  readonly voided = input(false, { transform: booleanAttribute });

  protected readonly toneClass = computed(() => `tone-${this.tone()}`);
}
