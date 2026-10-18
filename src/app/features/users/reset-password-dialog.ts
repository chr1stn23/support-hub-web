import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { toApiError } from '@core/api/api-error';
import { describeError, fieldErrorMessages } from '@core/api/error-messages';
import { UsersApi } from '@core/api/users.api';
import { Button, DialogFrame, Icon, PasswordField, ToastService } from '@shared/ui';
import { PASSWORD_HINT, validatePassword } from './password-rules';
import type { UserDialogData } from './user-dialog-data';

@Component({
  selector: 'app-reset-password-dialog',
  imports: [DialogFrame, Button, Icon, PasswordField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-frame title="Restablecer contraseña" (closed)="ref.close(false)">
      <form id="reset-form" class="dialog-form" (submit)="submit($event)" novalidate>
        <p class="callout callout--warning">
          <app-icon name="alert-triangle" [size]="16" />
          Se cerrarán todas las sesiones abiertas de {{ user.fullName }}. Comparte la nueva
          contraseña por un canal seguro.
        </p>

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
          label="Confirma la contraseña"
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
        <button appButton type="submit" form="reset-form" variant="primary" [loading]="busy()">
          Restablecer
        </button>
      </div>
    </app-dialog-frame>
  `,
})
export class ResetPasswordDialog {
  private readonly data = inject<UserDialogData>(DIALOG_DATA);
  private readonly api = inject(UsersApi);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected readonly user = this.data.user;
  protected readonly hint = PASSWORD_HINT;

  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly serverPasswordError = signal<string | null>(null);

  protected readonly passwordError = computed(
    () =>
      (this.submitted() ? validatePassword(this.password()) : null) ?? this.serverPasswordError(),
  );
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
    this.serverPasswordError.set(null);
    if (this.passwordError() !== null || this.confirmError() !== null) return;

    this.busy.set(true);
    try {
      await firstValueFrom(this.api.resetPassword(this.user.id, this.password()));
      this.toast.success(
        `Restableciste la contraseña de ${this.user.fullName}. Se cerraron sus sesiones abiertas.`,
      );
      this.ref.close(true);
    } catch (error) {
      const apiError = toApiError(error);
      const fields = fieldErrorMessages(apiError);
      if (apiError.code === 'RESOURCE_NOT_FOUND') {
        this.toast.error(describeError(error));
        this.ref.close(true);
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
