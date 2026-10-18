import { ComponentType } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';

import { describeError } from '@core/api/error-messages';
import { AssetsApi } from '@core/api/assets.api';
import type { UserAdmin } from '@core/api/models';
import { TicketsApi } from '@core/api/tickets.api';
import { UsersApi } from '@core/api/users.api';
import { AuthService } from '@core/auth/auth.service';
import { loadable } from '@core/http/loadable';
import {
  AssetStatusChip,
  PriorityBadge,
  TicketStatusChip,
  sortedRoleLabels,
} from '@shared/domain';
import {
  Button,
  Chip,
  DialogService,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  Time,
  ToastService,
} from '@shared/ui';
import { assetTitle } from '../assets/asset-text';
import { ResetPasswordDialog } from './reset-password-dialog';
import type { UserDialogData, UserFormData } from './user-dialog-data';
import { UserFormDialog } from './user-form-dialog';
import { UserRolesDialog } from './user-roles-dialog';

@Component({
  selector: 'app-user-detail-page',
  imports: [
    RouterLink,
    Button,
    Chip,
    EmptyState,
    ErrorState,
    Icon,
    Skeleton,
    Time,
    AssetStatusChip,
    TicketStatusChip,
    PriorityBadge,
  ],
  templateUrl: './user-detail-page.html',
  styleUrl: './user-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailPage {
  readonly id = input.required<string>();

  private readonly api = inject(UsersApi);
  private readonly assetsApi = inject(AssetsApi);
  private readonly ticketsApi = inject(TicketsApi);
  private readonly auth = inject(AuthService);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly title = inject(Title);

  protected readonly user = loadable(
    () => this.id(),
    (id) => this.api.get(id),
  );
  // Lo que la persona tiene a su cargo: es lo que impide desactivarla. Cada carga recuerda PARA QUIÉN se hizo
  protected readonly equipment = loadable(
    () => this.id(),
    (id) =>
      this.assetsApi
        .list({ page: 0, size: 50, sort: 'assetTag,asc', assignedTo: id })
        .pipe(map((page) => ({ id, page }))),
  );
  protected readonly tickets = loadable(
    () => this.id(),
    (id) =>
      this.ticketsApi
        .list({
          page: 0,
          size: 25,
          sort: 'createdAt,desc',
          statuses: ['IN_PROGRESS', 'WAITING'],
          priorities: [],
          assignedTo: id,
        })
        .pipe(map((page) => ({ id, page }))),
  );

  protected readonly view = computed(() => {
    const user = this.user.value();
    return user && user.id === this.id() ? user : null;
  });
  protected readonly equipmentPage = computed(() => {
    const loaded = this.equipment.value();
    return loaded && loaded.id === this.id() ? loaded.page : null;
  });
  protected readonly ticketsPage = computed(() => {
    const loaded = this.tickets.value();
    return loaded && loaded.id === this.id() ? loaded.page : null;
  });

  protected readonly userError = computed(() => {
    const state = this.user.state();
    return state.status === 'error' ? state.error : null;
  });
  /** El backend responde 404 si no existe; un id mal formado da 400. */
  protected readonly notFound = computed(() => {
    const error = this.userError();
    return error !== null && (error.status === 404 || error.status === 400);
  });
  protected readonly equipmentFailed = computed(() => this.equipment.state().status === 'error');
  protected readonly ticketsFailed = computed(() => this.tickets.state().status === 'error');

  protected readonly isSelf = computed(() => {
    const user = this.view();
    return user !== null && user.id === this.auth.user()?.id;
  });
  protected readonly roleLabels = computed(() => sortedRoleLabels(this.view()?.roles ?? []));

  /** Avisa de lo que impedirá desactivar la cuenta, antes de intentarlo. */
  protected readonly pendingHint = computed(() => {
    const user = this.view();
    if (!user?.active) return null;
    const assets = this.equipmentPage()?.totalElements ?? 0;
    const tickets = this.ticketsPage()?.totalElements ?? 0;
    if (assets === 0 && tickets === 0) return null;

    const parts: string[] = [];
    if (assets > 0) parts.push(assets === 1 ? '1 equipo' : `${assets} equipos`);
    if (tickets > 0)
      parts.push(tickets === 1 ? '1 ticket en curso' : `${tickets} tickets en curso`);
    return `Esta persona tiene a su cargo ${parts.join(' y ')}. Para poder desactivar su cuenta, devuelve los equipos y reasigna los tickets.`;
  });

  protected readonly toggling = signal(false);

  constructor() {
    effect(() => {
      const user = this.view();
      if (user) {
        this.title.setTitle(`${user.fullName} · SupportHub`);
      }
    });
  }

  protected assetName(asset: { brand: string | null; model: string | null; type: string }): string {
    return assetTitle(asset);
  }

  protected openEdit(user: UserAdmin): Promise<void> {
    return this.openDialog<UserFormData>(
      UserFormDialog,
      'Editar usuario',
      { user },
      'min(34rem, calc(100vw - 2rem))',
    );
  }

  protected openRoles(user: UserAdmin): Promise<void> {
    return this.openDialog<UserDialogData>(UserRolesDialog, 'Cambiar roles', { user });
  }

  protected openReset(user: UserAdmin): Promise<void> {
    return this.openDialog<UserDialogData>(ResetPasswordDialog, 'Restablecer contraseña', { user });
  }

  protected async deactivate(user: UserAdmin): Promise<void> {
    if (this.toggling()) return;

    const confirmed = await this.dialogs.confirm({
      title: 'Desactivar cuenta',
      message: `${user.fullName} ya no podrá iniciar sesión y se cerrarán sus sesiones abiertas. Podrás reactivar la cuenta cuando quieras.`,
      confirmLabel: 'Desactivar',
      destructive: true,
    });
    if (!confirmed) return;

    await this.toggle(
      () => this.api.deactivate(user.id),
      `Desactivaste la cuenta de ${user.fullName}.`,
    );
  }

  protected activate(user: UserAdmin): Promise<void> {
    return this.toggle(
      () => this.api.activate(user.id),
      `Reactivaste la cuenta de ${user.fullName}.`,
    );
  }

  protected refresh(): void {
    this.user.reload();
    this.equipment.reload();
    this.tickets.reload();
  }

  private async toggle(
    action: () => ReturnType<UsersApi['deactivate']>,
    success: string,
  ): Promise<void> {
    if (this.toggling()) return;
    this.toggling.set(true);
    try {
      await firstValueFrom(action());
      this.toast.success(success);
    } catch (error) {
      this.toast.error(describeError(error));
    } finally {
      this.toggling.set(false);
      this.refresh(); // salga como salga, la pantalla debe reflejar la realidad
    }
  }

  /** Cada diálogo devuelve true cuando la persona cambió (o dejó de ser lo que se veía): hay que recargar. */
  private async openDialog<D>(
    component: ComponentType<unknown>,
    ariaLabel: string,
    data: D,
    width?: string,
  ): Promise<void> {
    const ref = this.dialogs.open<unknown, boolean | string, D>(component, {
      data,
      ariaLabel,
      width,
    });
    if (await firstValueFrom(ref.closed, { defaultValue: false })) {
      this.refresh();
    }
  }
}
