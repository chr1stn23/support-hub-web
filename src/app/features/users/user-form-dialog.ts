import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';

import { toApiError } from '@core/api/api-error';
import { describeError, fieldErrorMessages } from '@core/api/error-messages';
import type { Role } from '@core/api/models';
import { UsersApi } from '@core/api/users.api';
import {
  Button,
  Control,
  DialogFrame,
  Field,
  Icon,
  PasswordField,
  ToastService,
} from '@shared/ui';
import { PASSWORD_HINT, validatePassword } from './password-rules';
import { RolePicker } from './role-picker';
import { buildUserUpdate, rebaseUser, userFormModelOf, UserFormModel } from './user-edit-changes';
import type { UserFormData } from './user-dialog-data';

type FieldName = keyof UserFormModel;
type ServerField = FieldName | 'password' | 'roles';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const NAME_MAX = 150;
const EMAIL_MAX = 255;

@Component({
  selector: 'app-user-form-dialog',
  imports: [FormField, DialogFrame, Button, Field, Control, Icon, PasswordField, RolePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-frame
      [title]="editing ? 'Editar usuario' : 'Nuevo usuario'"
      (closed)="ref.close(false)"
    >
      <form id="user-form" class="dialog-form" (submit)="submit($event)" novalidate>
        @if (conflict()) {
          <p class="callout callout--warning" role="alert">
            <app-icon name="alert-triangle" [size]="16" />
            Alguien más modificó a esta persona mientras la editabas. Actualizamos la información y
            conservamos tus cambios: revísalos y vuelve a guardar.
          </p>
        }
        @if (formError(); as message) {
          <p class="callout callout--error" role="alert">
            <app-icon name="alert-triangle" [size]="16" />
            {{ message }}
          </p>
        }

        <app-field label="Nombre completo" [error]="errorFor('fullName')" [required]="true">
          <input
            appControl
            type="text"
            autocomplete="off"
            [formField]="form.fullName"
            (input)="clearServerError('fullName')"
          />
        </app-field>

        <app-field label="Correo" [error]="errorFor('email')" [required]="true">
          <input
            appControl
            type="email"
            autocomplete="off"
            [formField]="form.email"
            (input)="clearServerError('email')"
          />
        </app-field>

        @if (!editing) {
          <app-password-field
            label="Contraseña inicial"
            [hint]="passwordHint"
            [error]="passwordError()"
            [required]="true"
            autocomplete="new-password"
            [(value)]="password"
            (valueChange)="clearServerError('password')"
          />
          <app-role-picker
            label="Roles"
            [required]="true"
            [error]="rolesError()"
            [(selected)]="roles"
            (selectedChange)="clearServerError('roles')"
          />
        }
      </form>

      <div dialogFooter class="dialog-actions">
        <button appButton type="button" (click)="ref.close(false)">Cancelar</button>
        <button
          appButton
          type="submit"
          form="user-form"
          variant="primary"
          [loading]="busy()"
          [disabled]="editing && !dirty()"
        >
          {{ editing ? 'Guardar cambios' : 'Crear usuario' }}
        </button>
      </div>
    </app-dialog-frame>
  `,
})
export class UserFormDialog {
  private readonly data = inject<UserFormData>(DIALOG_DATA);
  private readonly api = inject(UsersApi);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly ref = inject<DialogRef<string | boolean>>(DialogRef);

  private readonly user = this.data.user ?? null;
  protected readonly editing = this.user !== null;
  protected readonly passwordHint = PASSWORD_HINT;

  private readonly baseline = signal<UserFormModel>(
    this.user ? userFormModelOf(this.user) : { fullName: '', email: '' },
  );
  private version = this.user?.version ?? 0;
  protected readonly model = signal<UserFormModel>({ ...this.baseline() });
  protected readonly form = form(this.model, (path) => {
    required(path.fullName, { message: 'Escribe el nombre completo.' });
    maxLength(path.fullName, NAME_MAX, {
      message: `El nombre no puede superar los ${NAME_MAX} caracteres.`,
    });
    required(path.email, { message: 'Escribe el correo.' });
    maxLength(path.email, EMAIL_MAX, {
      message: `El correo no puede superar los ${EMAIL_MAX} caracteres.`,
    });
  });

  protected readonly password = signal('');
  protected readonly roles = signal<readonly Role[]>([]);

  protected readonly dirty = computed(
    () => buildUserUpdate(this.model(), this.baseline(), this.version) !== null,
  );

  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly conflict = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly serverErrors = signal<Partial<Record<ServerField, string>>>({});

  protected readonly passwordError = computed(
    () =>
      (this.submitted() ? validatePassword(this.password()) : null) ??
      this.serverErrors().password ??
      null,
  );
  protected readonly rolesError = computed(
    () =>
      (this.submitted() && this.roles().length === 0 ? 'Selecciona al menos un rol.' : null) ??
      this.serverErrors().roles ??
      null,
  );

  protected errorFor(name: FieldName): string | null {
    if (this.submitted()) {
      const value = this.model()[name].trim();
      if (value === '')
        return name === 'fullName' ? 'Escribe el nombre completo.' : 'Escribe el correo.';
      if (name === 'email' && !EMAIL_PATTERN.test(value))
        return 'Ingresa un correo electrónico válido.';
      const client = this.form[name]().errors()[0]?.message;
      if (client) return client;
    }
    return this.serverErrors()[name] ?? null;
  }

  protected clearServerError(name: ServerField): void {
    if (this.serverErrors()[name]) {
      this.serverErrors.update((errors) => ({ ...errors, [name]: undefined }));
    }
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    this.submitted.set(true);
    this.serverErrors.set({});
    this.formError.set(null);

    const invalid =
      this.errorFor('fullName') !== null ||
      this.errorFor('email') !== null ||
      (!this.editing && (this.passwordError() !== null || this.rolesError() !== null));
    if (invalid) {
      this.focusFirstInvalid();
      return;
    }

    const user = this.user;
    const update = user ? buildUserUpdate(this.model(), this.baseline(), this.version) : null;
    if (user && !update) return;

    this.busy.set(true);
    try {
      if (user && update) {
        await firstValueFrom(this.api.update(user.id, update));
        this.toast.success('Guardaste los cambios del usuario.');
        this.ref.close(true);
      } else {
        const m = this.model();
        const created = await firstValueFrom(
          this.api.create({
            email: m.email.trim(),
            fullName: m.fullName.trim(),
            password: this.password(),
            roles: [...this.roles()],
          }),
        );
        this.toast.success(`Creaste la cuenta de ${created.fullName}.`);
        this.ref.close(created.id);
      }
    } catch (error) {
      await this.handleFailure(error);
    } finally {
      this.busy.set(false);
    }
  }

  private async handleFailure(error: unknown): Promise<void> {
    const apiError = toApiError(error);

    if (apiError.code === 'CONCURRENT_MODIFICATION' && this.user) {
      await this.rebaseOnLatest(error, this.user.id);
    } else if (apiError.code === 'EMAIL_ALREADY_USED') {
      this.serverErrors.set({ email: describeError(error) });
      this.focusFirstInvalid();
    } else if (apiError.code === 'RESOURCE_NOT_FOUND' && this.user) {
      this.toast.error(describeError(error));
      this.ref.close(true);
    } else {
      const fields = fieldErrorMessages(apiError);
      if (Object.keys(fields).length > 0) {
        this.serverErrors.set(fields as Partial<Record<ServerField, string>>);
        this.focusFirstInvalid();
      } else {
        this.formError.set(describeError(error));
      }
    }
  }

  /** Trae la versión actual de la persona y la fusiona con lo que se venía cambiando. */
  private async rebaseOnLatest(original: unknown, id: string): Promise<void> {
    try {
      const fresh = await firstValueFrom(this.api.get(id));
      const merged = rebaseUser(this.model(), this.baseline(), userFormModelOf(fresh));
      this.version = fresh.version;
      this.baseline.set(merged.baseline);
      this.model.set(merged.model);
      this.submitted.set(false);
      this.conflict.set(true);
    } catch (error) {
      this.formError.set(
        describeError(toApiError(error).code === 'RESOURCE_NOT_FOUND' ? error : original),
      );
    }
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }
}
