import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { toApiError } from '@core/api/api-error';
import { describeError } from '@core/api/error-messages';
import type { Role } from '@core/api/models';
import { UsersApi } from '@core/api/users.api';
import { AuthService } from '@core/auth/auth.service';
import { Button, DialogFrame, Icon, ToastService } from '@shared/ui';
import { RolePicker } from './role-picker';
import type { UserDialogData } from './user-dialog-data';

@Component({
  selector: 'app-user-roles-dialog',
  imports: [DialogFrame, Button, Icon, RolePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-frame title="Cambiar roles" (closed)="ref.close(false)">
      <form id="roles-form" class="dialog-form" (submit)="submit($event)" novalidate>
        <p class="intro">
          Roles de <strong>{{ user.fullName }}</strong
          >. El cambio se aplica de inmediato: la próxima vez que use la aplicación verá sus nuevos
          permisos.
        </p>

        <app-role-picker
          label="Roles"
          [required]="true"
          [lockedRoles]="lockedRoles"
          [lockedHint]="lockedHint"
          [error]="rolesError()"
          [(selected)]="roles"
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
          form="roles-form"
          variant="primary"
          [loading]="busy()"
          [disabled]="!changed()"
        >
          Guardar roles
        </button>
      </div>
    </app-dialog-frame>
  `,
  styles: `
    .intro {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
  `,
})
export class UserRolesDialog {
  private readonly data = inject<UserDialogData>(DIALOG_DATA);
  private readonly api = inject(UsersApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected readonly user = this.data.user;

  /** Nadie puede quitarse a sí mismo el rol de administrador: el servidor lo rechaza. */
  protected readonly lockedRoles: readonly Role[] =
    this.auth.user()?.id === this.user.id && this.user.roles.includes('ADMIN') ? ['ADMIN'] : [];
  protected readonly lockedHint =
    'No puedes quitarte tu propio rol de administrador. Pídeselo a otro administrador.';

  protected roles = signal<readonly Role[]>([...this.user.roles]);
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly changed = computed(() => {
    const now = this.roles();
    return (
      now.length !== this.user.roles.length || now.some((role) => !this.user.roles.includes(role))
    );
  });
  protected readonly rolesError = computed(() =>
    this.submitted() && this.roles().length === 0 ? 'Selecciona al menos un rol.' : null,
  );

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    this.submitted.set(true);
    this.serverError.set(null);
    if (this.roles().length === 0 || !this.changed()) return;

    this.busy.set(true);
    try {
      await firstValueFrom(this.api.changeRoles(this.user.id, this.roles()));
      this.toast.success(`Actualizaste los roles de ${this.user.fullName}.`);
      this.ref.close(true);
    } catch (error) {
      if (toApiError(error).code === 'RESOURCE_NOT_FOUND') {
        this.toast.error(describeError(error));
        this.ref.close(true); // la pantalla se recarga y vuelve a decir la verdad
      } else {
        this.serverError.set(describeError(error));
      }
    } finally {
      this.busy.set(false);
    }
  }
}
