import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { Button } from '../button/button';
import { describeError } from '@core/api/error-messages';

/** Para cuando una carga falla. Muestra el motivo y ofrece reintentar. */
@Component({
  selector: 'app-error-state',
  imports: [Icon, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'alert' },
  template: `
    <app-icon class="icon" name="alert-triangle" [size]="28" />
    <h3 class="title">{{ title() }}</h3>
    <p class="description">{{ message() }}</p>
    @if (retryable()) {
      <button appButton (click)="retry.emit()">Reintentar</button>
    }
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
      color: var(--color-danger);
    }
    .title {
      font-size: var(--text-md);
    }
    .description {
      max-width: 28rem;
      color: var(--color-text-secondary);
    }
    button {
      margin-top: var(--space-2);
    }
  `,
})
export class ErrorState {
  /** Cualquier error: se traduce por su código. Nunca se muestra el texto en inglés del servidor. */
  readonly error = input<unknown>(null);
  readonly title = input('No pudimos cargar esta información');
  readonly retryable = input(true, { transform: booleanAttribute });
  readonly retry = output<void>();

  protected readonly message = computed(() => describeError(this.error()));
}
