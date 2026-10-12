/* eslint-disable @angular-eslint/component-selector --
   Componente de atributo a propósito: se aplica a un <button> o <a> nativo y conserva sus semánticas. */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';

import { Icon } from '../icon/icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'button[appButton], a[appButton]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'btn',
    '[class.btn--primary]': "variant() === 'primary'",
    '[class.btn--secondary]': "variant() === 'secondary'",
    '[class.btn--ghost]': "variant() === 'ghost'",
    '[class.btn--danger]': "variant() === 'danger'",
    '[class.btn--sm]': "size() === 'sm'",
    '[class.btn--lg]': "size() === 'lg'",
    '[class.btn--icon]': 'iconOnly()',
    '[class.is-loading]': 'loading()',
    '[attr.type]': 'nativeType()',
    '[attr.disabled]': "isDisabled() ? '' : null",
    '[attr.aria-disabled]': "isDisabled() ? 'true' : null",
    '[attr.aria-busy]': "loading() ? 'true' : null",
    '[attr.tabindex]': 'anchorTabIndex()',
  },
  template: `
    @if (loading()) {
      <app-icon name="loader" [size]="14" spin />
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      height: var(--control-h-md);
      padding: 0 var(--space-3);
      font-size: var(--text-md);
      font-weight: var(--weight-medium);
      line-height: 1;
      white-space: nowrap;
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      color: var(--color-text);
      background: var(--color-bg);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      transition:
        background-color var(--dur-fast) var(--ease-out),
        border-color var(--dur-fast) var(--ease-out);
    }
    :host(:hover) {
      background: var(--color-bg-hover);
      color: var(--color-text);
      text-decoration: none;
    }

    :host(.btn--primary) {
      color: var(--color-on-accent);
      background: var(--color-accent);
      border-color: var(--color-accent);
    }
    :host(.btn--primary:hover) {
      color: var(--color-on-accent);
      background: var(--color-accent-hover);
      border-color: var(--color-accent-hover);
    }
    :host(.btn--primary:active) {
      background: var(--color-accent-active);
      border-color: var(--color-accent-active);
    }

    :host(.btn--ghost) {
      color: var(--color-text-secondary);
      background: transparent;
      border-color: transparent;
    }
    :host(.btn--ghost:hover) {
      color: var(--color-text);
      background: var(--color-bg-hover);
    }

    :host(.btn--danger) {
      color: var(--color-on-accent);
      background: var(--color-danger);
      border-color: var(--color-danger);
    }
    :host(.btn--danger:hover) {
      color: var(--color-on-accent);
      background: var(--color-danger-hover);
      border-color: var(--color-danger-hover);
    }

    :host(.btn--sm) {
      height: var(--control-h-sm);
      padding: 0 var(--space-2);
      font-size: var(--text-sm);
    }
    :host(.btn--lg) {
      height: var(--control-h-lg);
      padding: 0 var(--space-4);
    }
    :host(.btn--icon) {
      width: var(--control-h-md);
      padding: 0;
    }
    :host(.btn--icon.btn--sm) {
      width: var(--control-h-sm);
    }
    :host(.btn--icon.btn--lg) {
      width: var(--control-h-lg);
    }

    :host([aria-disabled='true']) {
      color: var(--color-text-disabled);
      background: var(--color-bg-subtle);
      border-color: var(--color-border);
      cursor: not-allowed;
      pointer-events: none;
    }
    :host(.is-loading) {
      cursor: progress;
    }
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  /** Botón cuadrado solo con icono. Quien lo use debe darle un aria-label. */
  readonly iconOnly = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  private readonly isButton =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'BUTTON';

  readonly isDisabled = computed(() => this.disabled() || this.loading());
  /** Por defecto "button": un botón dentro de un formulario no envía el formulario por accidente. */
  readonly nativeType = computed(() => (this.isButton ? this.type() : null));
  /** Un enlace deshabilitado sale del orden de tabulación. */
  readonly anchorTabIndex = computed(() => (!this.isButton && this.isDisabled() ? -1 : null));
}
