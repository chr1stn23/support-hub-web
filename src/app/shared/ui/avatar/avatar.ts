import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { initials, toneFor } from "./initials";

export type AvatarSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    '[attr.aria-label]': 'accessibleName()',
    '[class]': 'hostClass()',
  },
  template: `@if (text(); as value) {
    <span aria-hidden="true">{{ value }}</span>
  }`,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      flex-shrink: 0;
      width: 1.5rem;
      height: 1.5rem;
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      line-height: 1;
      color: var(--tone-fg);
      background: var(--tone-bg);
      border-radius: var(--radius-full);
      user-select: none;
    }
    :host(.avatar--sm) {
      width: 1.25rem;
      height: 1.25rem;
      font-size: 0.6875rem;
    }
    :host(.avatar--lg) {
      width: 2rem;
      height: 2rem;
      font-size: var(--text-sm);
    }
    /* Sin nombre: círculo punteado, como "sin asignar" */
    :host(.avatar--none) {
      background: transparent;
      border: 1px dashed var(--color-border-strong);
    }
  `,
})
export class Avatar {
  readonly name = input<string | null | undefined>(null);
  readonly size = input<AvatarSize>('md');
  /** Texto que lee un lector de pantalla cuando no hay nombre. */
  readonly emptyLabel = input('Sin asignar');

  protected readonly text = computed(() => initials(this.name()));
  protected readonly accessibleName = computed(() => this.name()?.trim() || this.emptyLabel());
  protected readonly hostClass = computed(() => {
    const parts = [`avatar--${this.size()}`];
    parts.push(this.text() ? `tone-${toneFor(this.name())}` : 'avatar--none');
    return parts.join(' ');
  });
}
