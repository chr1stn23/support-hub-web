import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, DialogFrame, Icon, ToastService } from '@shared/ui';
import { AssetDialogData } from '@features/assets/asset-dialog-data';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { AssetsApi } from '@core/api/assets.api';
import { assetStatusAction } from '@features/assets/asset-text';
import { AssetStatus } from '@core/api/models';
import { firstValueFrom } from 'rxjs';
import { isStaleAssetError } from '@features/assets/asset-errors';
import { toApiError } from '@core/api/api-error';
import { describeError } from '@core/api/error-messages';
import { ASSET_STATUS } from '@shared/domain';

@Component({
  selector: 'app-asset-status-dialog',
  imports: [DialogFrame, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-frame title="Cambiar estado" (closed)="ref.close(false)">
      <form id="asset-status-form" class="form" (submit)="submit($event)" novalidate>
        <fieldset class="options">
          <legend class="legend">Nuevo estado</legend>
          @for (option of options; track option.status) {
            <label class="option" [class.is-selected]="selected() === option.status">
              <input
                type="radio"
                name="asset-status"
                [value]="option.status"
                [checked]="selected() === option.status"
                (change)="selected.set(option.status)"
              />
              <span class="option__text">
                <span class="option__title">{{ option.text.title }}</span>
                <span class="option__description">{{ option.text.description }}</span>
              </span>
            </label>
          }
          @if (selectionError(); as message) {
            <p class="error" role="alert">
              <app-icon name="alert-triangle" [size]="14" />
              {{ message }}
            </p>
          }
        </fieldset>

        @if (serverError(); as message) {
          <p class="callout" role="alert">
            <app-icon name="alert-triangle" [size]="16" />
            {{ message }}
          </p>
        }
      </form>

      <div dialogFooter class="actions">
        <button appButton type="button" (click)="ref.close(false)">Cancelar</button>
        <button
          appButton
          type="submit"
          form="asset-status-form"
          [variant]="destructive() ? 'danger' : 'primary'"
          [loading]="busy()"
        >
          Confirmar
        </button>
      </div>
    </app-dialog-frame>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--space-4);
    }
    .options {
      display: grid;
      gap: var(--space-2);
      padding: 0;
      margin: 0;
      border: 0;
    }
    .legend {
      padding: 0;
      margin-bottom: var(--space-1);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }
    .option {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3);
      cursor: pointer;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .option:hover {
      background: var(--color-bg-subtle);
    }
    .option.is-selected {
      background: var(--color-bg-selected);
      border-color: var(--color-accent);
    }
    .option input {
      flex-shrink: 0;
      margin: 0.2rem 0 0;
      accent-color: var(--color-accent);
    }
    .option__text {
      display: grid;
      gap: 2px;
    }
    .option__title {
      font-weight: var(--weight-medium);
    }
    .option__description {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
    .error {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-xs);
      color: var(--color-danger);
    }
    .callout {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3);
      font-size: var(--text-sm);
      color: var(--red-800);
      background: var(--red-100);
      border-radius: var(--radius-sm);
    }
    .actions {
      display: contents;
    }
  `,
})
export class AssetStatusDialog {
  private readonly data = inject<AssetDialogData>(DIALOG_DATA);
  private readonly api = inject(AssetsApi);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);

  private readonly asset = this.data.asset;
  protected readonly options = this.asset.actions.changeStatus.map((status) => ({
    status,
    text: assetStatusAction(status),
  }));

  protected readonly selected = signal<AssetStatus | null>(
    this.options.length === 1 ? this.options[0].status : null,
  );
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly destructive = computed(() => {
    const current = this.options.find((option) => option.status === this.selected());
    return current?.text.destructive ?? false;
  });
  protected readonly selectionError = computed(() =>
    this.submitted() && this.selected() === null ? 'Selecciona el nuevo estado.' : null,
  );

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    this.submitted.set(true);
    this.serverError.set(null);
    const status = this.selected();
    if (!status) return;

    this.busy.set(true);
    try {
      await firstValueFrom(this.api.changeStatus(this.asset.id, status));
      this.toast.success(
        `El equipo ${this.asset.assetTag} ahora está «${ASSET_STATUS[status].label}».`,
      );
      this.ref.close(true);
    } catch (error) {
      if (isStaleAssetError(toApiError(error).code)) {
        this.toast.error(describeError(error));
        this.ref.close(true);
      } else {
        this.serverError.set(describeError(error));
      }
    } finally {
      this.busy.set(false);
    }
  }
}
