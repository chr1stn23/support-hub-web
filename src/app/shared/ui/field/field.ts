import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { Icon } from '../icon/icon';

let nextFieldId = 0;

/**
 * Envuelve un control nativo (con la directiva appControl) con su etiqueta, ayuda y error.
 * La etiqueta, el mensaje y los atributos de accesibilidad del control se conectan solos.
 */
@Component({
  selector: 'app-field',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="label" [attr.for]="controlId">
      {{ label() }}
      @if (required()) {
        <span class="required" aria-hidden="true">*</span>
      }
    </label>
    <ng-content />
    @if (error(); as message) {
      <p class="message message--error" [id]="errorId" role="alert">
        <app-icon name="alert-triangle" [size]="14" />
        {{ message }}
      </p>
    } @else if (hint(); as text) {
      <p class="message" [id]="hintId">{{ text }}</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-1);
    }
    .label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--color-text);
    }
    .required {
      margin-left: 2px;
      color: var(--color-danger);
    }
    .message {
      display: flex;
      align-items: flex-start;
      gap: var(--space-1);
      font-size: var(--text-xs);
      line-height: var(--leading-normal);
      color: var(--color-text-secondary);
    }
    .message--error {
      color: var(--color-danger);
    }
    .message app-icon {
      margin-top: 1px;
    }
  `,
})
export class Field {
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly required = input(false, { transform: booleanAttribute });

  readonly controlId = `app-field-${nextFieldId++}`;
  readonly errorId = `${this.controlId}-error`;
  readonly hintId = `${this.controlId}-hint`;

  readonly hasError = computed(() => !!this.error());
  /** A qué texto remite el control: el error si hay, y si no, la ayuda. */
  readonly describedBy = computed(() => {
    if (this.error()) return this.errorId;
    return this.hint() ? this.hintId : null;
  });
}
