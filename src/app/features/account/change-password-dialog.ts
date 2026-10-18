import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { toApiError } from '@core/api/api-error';
import { describeError, fieldErrorMessages } from '@core/api/error-messages';
import { UsersApi } from '@core/api/users.api';
import { Button, DialogFrame, Icon, PasswordField, ToastService } from '@shared/ui';
import { PASSWORD_HINT, validatePassword } from '../users/password-rules';

@Component({
  selector: 'app-change-password-dialog',
  imports: [DialogFrame, Button, Icon, PasswordField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-frame title="Cambiar mi contraseña" (closed)="ref.close(false)">
      <form id="change-password-form" class="dialog-form" (submit)="submit($event)" novalidate>
        <p class="callout callout--info">
          <app-icon name="info" [size]="16" />
          Seguirás con la sesión abierta en este dispositivo. Se cerrarán las de tus otros
          dispositivos.
        </p>

        <app-password-field
          label="Contraseña actual"
          [error]="currentError()"
          [required]="true"
          autocomplete="current-password"
          [(value)]="current"
          (valueChange)="serverCurrentError.set(null)"
        />
        <app-password-field
          label="Nueva contraseña"
          [hint]="hint"
          [error]="passwordError()"
          [required]="true"
          autocomplete="new-password"
          [(value)]="password"
          (valueChange)="serverPasswordError.set(null)"
        />
        <app-password-field
          label="Confirma la nueva contraseña"
          [error]="confirmError()"
          [required]="true"
          autocomplete="new-password"
          [(value)]="confirm"
        />

        @if (serverError(); as message) {
          <p class="callout callout--error" role="alert">
            <app-icon name="alert-triangle" [size]="16" />
            {{ message }}
          </p>
        }
      </form>

      <div dialogFooter class="dialog-actions">
        <button appButton type="button" (click)="ref.close(false)">Cancelar</button>
        <button
          appButton
          type="submit"
          form="change-password-form"
          variant="primary"
          [loading]="busy()"
        >
          Cambiar contraseña
        </button>
      </div>
    </app-dialog-frame>
  `,
})
export class ChangePasswordDialog {
  private readonly api = inject(UsersApi);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected readonly hint = PASSWORD_HINT;

  protected readonly current = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly serverCurrentError = signal<string | null>(null);
  protected readonly serverPasswordError = signal<string | null>(null);

  protected readonly currentError = computed(
    () =>
      (this.submitted() && this.current() === '' ? 'Escribe tu contraseña actual.' : null) ??
      this.serverCurrentError(),
  );
  protected readonly passwordError = computed(() => {
    if (this.submitted()) {
      const rules = validatePassword(this.password());
      if (rules) return rules;
      // El servidor también lo rechaza: así se avisa sin esperar la respuesta
      if (this.current() !== '' && this.password() === this.current()) {
        return 'La nueva contraseña debe ser distinta de la actual.';
      }
    }
    return this.serverPasswordError();
  });
  protected readonly confirmError = computed(() =>
    this.submitted() &&
    validatePassword(this.password()) === null &&
    this.confirm() !== this.password()
      ? 'Las contraseñas no coinciden.'
      : null,
  );

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    this.submitted.set(true);
    this.serverError.set(null);
    this.serverCurrentError.set(null);
    this.serverPasswordError.set(null);
    if (
      this.currentError() !== null ||
      this.passwordError() !== null ||
      this.confirmError() !== null
    )
      return;

    this.busy.set(true);
    try {
      await firstValueFrom(this.api.changeOwnPassword(this.current(), this.password()));
      this.toast.success('Cambiaste tu contraseña. Cerramos tu sesión en los demás dispositivos.');
      this.ref.close(true);
    } catch (error) {
      const apiError = toApiError(error);
      const fields = fieldErrorMessages(apiError);
      if (apiError.code === 'INVALID_CURRENT_PASSWORD') {
        this.serverCurrentError.set(describeError(error));
      } else if (fields['currentPassword']) {
        this.serverCurrentError.set(fields['currentPassword']);
      } else if (fields['newPassword']) {
        this.serverPasswordError.set(fields['newPassword']);
      } else {
        this.serverError.set(describeError(error));
      }
    } finally {
      this.busy.set(false);
    }
  }
}
