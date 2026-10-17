import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Avatar,
  Button,
  DialogService,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  Time,
  ToastService,
} from '@shared/ui';
import { AssetStatusChip, PriorityBadge, TicketStatusChip } from '@shared/domain';
import { AssignmentTimeline } from '@features/assets/assignment-timeline';
import { AssetsApi } from '@core/api/assets.api';
import { Title } from '@angular/platform-browser';
import { loadable } from '@core/http/loadable';
import { firstValueFrom, map } from 'rxjs';
import { assetTitle } from '@features/assets/asset-text';
import { AssetDetail } from '@core/api/models';
import {
  AssetAssignDialogData,
  AssetDialogData,
  AssetFormData,
} from '@features/assets/asset-dialog-data';
import { AssetAssignDialog } from '@features/assets/asset-assign-dialog';
import { AssetStatusDialog } from '@features/assets/asset-status-dialog';
import { AssetFormDialog } from '@features/assets/asset-form-dialog';
import { describeError } from '@core/api/error-messages';
import { ComponentType } from '@angular/cdk/portal';

@Component({
  selector: 'app-asset-detail-page',
  imports: [
    RouterLink,
    Avatar,
    Button,
    EmptyState,
    ErrorState,
    Icon,
    Skeleton,
    Time,
    AssetStatusChip,
    TicketStatusChip,
    PriorityBadge,
    AssignmentTimeline,
  ],
  templateUrl: './asset-detail-page.html',
  styleUrl: './asset-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetDetailPage {
  readonly id = input.required<string>();

  private readonly api = inject(AssetsApi);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly title = inject(Title);

  protected readonly asset = loadable(
    () => this.id(),
    (id) => this.api.get(id),
  );
  // Cada carga recuerda PARA QUÉ equipo se hizo: nunca se muestra, ni un instante, lo del equipo anterior
  protected readonly assignments = loadable(
    () => this.id(),
    (id) => this.api.assignments(id).pipe(map((items) => ({ id, items }))),
  );
  protected readonly tickets = loadable(
    () => this.id(),
    (id) => this.api.relatedTickets(id).pipe(map((items) => ({ id, items }))),
  );

  protected readonly view = computed(() => {
    const asset = this.asset.value();
    return asset && asset.id === this.id() ? asset : null;
  });
  protected readonly assignmentList = computed(() => {
    const loaded = this.assignments.value();
    return loaded && loaded.id === this.id() ? loaded.items : null;
  });
  protected readonly ticketList = computed(() => {
    const loaded = this.tickets.value();
    return loaded && loaded.id === this.id() ? loaded.items : null;
  });

  protected readonly assetError = computed(() => {
    const state = this.asset.state();
    return state.status === 'error' ? state.error : null;
  });
  protected readonly notFound = computed(() => {
    const error = this.assetError();
    return error !== null && (error.status === 404 || error.status === 400);
  });
  protected readonly assignmentsFailed = computed(
    () => this.assignments.state().status === 'error',
  );
  protected readonly ticketsFailed = computed(() => this.tickets.state().status === 'error');
  protected readonly displayTitle = computed(() => {
    const asset = this.view();
    return asset
      ? assetTitle({ brand: asset.brand, model: asset.model, type: asset.type.name })
      : '';
  });

  protected readonly returning = signal(false);

  constructor() {
    effect(() => {
      const asset = this.view();
      if (asset) {
        this.title.setTitle(`${asset.assetTag} · SupportHub`);
      }
    });
  }

  protected openAssign(asset: AssetDetail): Promise<void> {
    return this.openDialog<AssetAssignDialogData>(AssetAssignDialog, 'Asignar equipo', {
      asset,
      mode: 'assign',
    });
  }

  protected openTransfer(asset: AssetDetail): Promise<void> {
    return this.openDialog<AssetAssignDialogData>(AssetAssignDialog, 'Transferir equipo', {
      asset,
      mode: 'transfer',
    });
  }

  protected openStatus(asset: AssetDetail): Promise<void> {
    return this.openDialog<AssetDialogData>(AssetStatusDialog, 'Cambiar estado', { asset });
  }

  protected openEdit(asset: AssetDetail): Promise<void> {
    return this.openDialog<AssetFormData>(
      AssetFormDialog,
      'Editar equipo',
      { asset },
      'min(36rem, calc(100vw - 2rem))',
    );
  }

  protected async returnAsset(asset: AssetDetail): Promise<void> {
    if (this.returning()) return;

    const holder = asset.assignedTo?.fullName ?? 'la persona';
    const confirmed = await this.dialogs.confirm({
      title: 'Registrar devolución',
      message: `Se registrará que ${holder} devolvió el equipo ${asset.assetTag}. Quedará disponible para asignarlo.`,
      confirmLabel: 'Registrar devolución',
    });
    if (!confirmed) return;

    this.returning.set(true);
    try {
      await firstValueFrom(this.api.returnAsset(asset.id));
      this.toast.success(`Registraste la devolución del equipo ${asset.assetTag}.`);
    } catch (error) {
      this.toast.error(describeError(error));
    } finally {
      this.returning.set(false);
      this.refresh(); // salga como salga, la pantalla debe reflejar la realidad
    }
  }

  protected refresh(): void {
    this.asset.reload();
    this.assignments.reload();
  }

  protected reloadAll(): void {
    this.refresh();
    this.tickets.reload();
  }

  /** Cada diálogo devuelve true cuando el equipo cambió (o dejó de ser lo que se veía): hay que recargar. */
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
