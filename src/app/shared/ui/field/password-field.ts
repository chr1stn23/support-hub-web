import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  input,
  model,
  signal,
} from '@angular/core';

import { Control } from './control';
import { Field } from './field';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

console.log('PasswordField deps →', { Field, Control, Button, Icon });

/** Campo de contraseña con botón para mostrarla u ocultarla. Uso: [(value)]="contraseña". */
@Component({
  selector: 'app-password-field',
  imports: [Field, Control, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-field [label]="label()" [hint]="hint()" [error]="error()" [required]="required()">
      <div class="wrap">
        <input
          appControl
          spellcheck="false"
          autocapitalize="off"
          [type]="visible() ? 'text' : 'password'"
          [attr.autocomplete]="autocomplete()"
          [value]="value()"
          (input)="value.set($any($event.target).value)"
        />
        <button
          appButton
          variant="ghost"
          size="sm"
          iconOnly
          type="button"
          [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          [attr.aria-pressed]="visible()"
          (click)="visible.set(!visible())"
        >
          <app-icon [name]="visible() ? 'eye-off' : 'eye'" [size]="16" />
        </button>
      </div>
    </app-field>
  `,
  styles: `
    .wrap {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .wrap input {
      flex: 1;
      min-width: 0;
    }
  `,
})
export class PasswordField {
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly required = input(false, { transform: booleanAttribute });
  readonly autocomplete = input<'new-password' | 'current-password'>('new-password');
  readonly value = model('');

  protected readonly visible = signal(false);
}
