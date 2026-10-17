import {
  AssetFormModel,
  buildAssetCreate,
  buildAssetUpdate,
  EMPTY_ASSET_FORM,
  formModelOf,
  rebaseAsset,
} from '@features/assets/asset-edit-changes';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { form, FormField, maxLength, required } from '@angular/forms/signals';
import { Button, Control, DialogFrame, Field, Icon, ToastService } from '@shared/ui';
import { AssetFormData } from '@features/assets/asset-dialog-data';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { AssetsApi } from '@core/api/assets.api';
import { loadable } from '@core/http/loadable';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '@core/api/api-error';
import { describeError, fieldErrorMessages } from '@core/api/error-messages';
import { isStaleAssetError } from '@features/assets/asset-errors';

type FieldName = keyof AssetFormModel;

const BRAND_MAX = 80;
const MODEL_MAX = 120;
const SERIAL_MAX = 120;
const LOCATION_MAX = 120;
const FIELDS: readonly FieldName[] = ['assetTypeId', 'brand', 'model', 'serialNumber', 'location'];

@Component({
  selector: 'app-asset-form-dialog',
  imports: [FormField, DialogFrame, Button, Field, Control, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-frame
      [title]="editing ? 'Editar equipo' : 'Nuevo equipo'"
      (closed)="ref.close(false)"
    >
      <form id="asset-form" class="form" (submit)="submit($event)" novalidate>
        @if (conflict()) {
          <p class="callout callout--warning" role="alert">
            <app-icon name="alert-triangle" [size]="16" />
            Alguien más modificó este equipo mientras lo editabas. Actualizamos la información y
            conservamos tus cambios: revísalos y vuelve a guardar.
          </p>
        }
        @if (formError(); as message) {
          <p class="callout callout--error" role="alert">
            <app-icon name="alert-triangle" [size]="16" />
            {{ message }}
          </p>
        }

        <app-field
          label="Tipo"
          [hint]="
            typesFailed()
              ? 'No pudimos cargar los demás tipos. Cierra y vuelve a abrir para reintentar.'
              : null
          "
          [error]="errorFor('assetTypeId')"
          [required]="true"
        >
          <select
            appControl
            [formField]="form.assetTypeId"
            (change)="clearServerError('assetTypeId')"
          >
            @if (!editing) {
              <option value="">Selecciona un tipo</option>
            }
            @for (type of typeOptions(); track type.id) {
              <option [value]="type.id">{{ type.name }}</option>
            }
          </select>
        </app-field>

        <div class="pair">
          <app-field label="Marca" [error]="errorFor('brand')" [required]="true">
            <input
              appControl
              type="text"
              autocomplete="off"
              [formField]="form.brand"
              (input)="clearServerError('brand')"
            />
          </app-field>
          <app-field label="Modelo" [error]="errorFor('model')" [required]="true">
            <input
              appControl
              type="text"
              autocomplete="off"
              [formField]="form.model"
              (input)="clearServerError('model')"
            />
          </app-field>
        </div>

        <app-field
          label="Número de serie"
          hint="Opcional. No puede repetirse entre equipos."
          [error]="errorFor('serialNumber')"
        >
          <input
            appControl
            type="text"
            autocomplete="off"
            [formField]="form.serialNumber"
            (input)="clearServerError('serialNumber')"
          />
        </app-field>

        <app-field
          label="Ubicación"
          hint="Opcional. Por ejemplo: Piso 2 o Almacén."
          [error]="errorFor('location')"
        >
          <input
            appControl
            type="text"
            autocomplete="off"
            [formField]="form.location"
            (input)="clearServerError('location')"
          />
        </app-field>
      </form>

      <div dialogFooter class="actions">
        <button appButton type="button" (click)="ref.close(false)">Cancelar</button>
        <button
          appButton
          type="submit"
          form="asset-form"
          variant="primary"
          [loading]="busy()"
          [disabled]="editing && !dirty()"
        >
          {{ editing ? 'Guardar cambios' : 'Registrar equipo' }}
        </button>
      </div>
    </app-dialog-frame>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--space-4);
    }
    .pair {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4);
    }
    .callout {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      padding: var(--space-3);
      font-size: var(--text-sm);
      line-height: var(--leading-normal);
      border-radius: var(--radius-sm);
    }
    .callout app-icon {
      margin-top: 1px;
    }
    .callout--warning {
      color: var(--amber-800);
      background: var(--amber-100);
    }
    .callout--error {
      color: var(--red-800);
      background: var(--red-100);
    }
    .actions {
      display: contents;
    }
    @media (max-width: 40rem) {
      .pair {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class AssetFormDialog {
  private readonly data = inject<AssetFormData>(DIALOG_DATA);
  private readonly api = inject(AssetsApi);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly ref = inject<DialogRef<string | boolean>>(DialogRef);

  private readonly asset = this.data.asset ?? null;
  protected readonly editing = this.asset !== null;

  private readonly types = loadable(
    () => true,
    () => this.api.types(),
  );
  /** El tipo actual siempre está en la lista (aunque ya no esté activo), para que el selector lo muestre desde el primer momento. */
  protected readonly typeOptions = computed(() => {
    const loaded = this.types.value() ?? [];
    const current = this.asset?.type;
    return current && !loaded.some((type) => type.id === current.id)
      ? [current, ...loaded]
      : loaded;
  });
  protected readonly typesFailed = computed(() => this.types.state().status === 'error');

  private readonly baseline = signal<AssetFormModel>(
    this.asset ? formModelOf(this.asset) : { ...EMPTY_ASSET_FORM },
  );
  private version = this.asset?.version ?? 0;
  protected readonly model = signal<AssetFormModel>({ ...this.baseline() });
  protected readonly form = form(this.model, (path) => {
    required(path.assetTypeId, { message: 'Selecciona un tipo.' });
    required(path.brand, { message: 'Escribe la marca.' });
    maxLength(path.brand, BRAND_MAX, {
      message: `La marca no puede superar los ${BRAND_MAX} caracteres.`,
    });
    required(path.model, { message: 'Escribe el modelo.' });
    maxLength(path.model, MODEL_MAX, {
      message: `El modelo no puede superar los ${MODEL_MAX} caracteres.`,
    });
    maxLength(path.serialNumber, SERIAL_MAX, {
      message: `El número de serie no puede superar los ${SERIAL_MAX} caracteres.`,
    });
    maxLength(path.location, LOCATION_MAX, {
      message: `La ubicación no puede superar los ${LOCATION_MAX} caracteres.`,
    });
  });

  protected readonly dirty = computed(
    () => buildAssetUpdate(this.model(), this.baseline(), this.version) !== null,
  );

  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly conflict = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly serverErrors = signal<Partial<Record<FieldName, string>>>({});

  protected errorFor(name: FieldName): string | null {
    if (this.submitted()) {
      if ((name === 'brand' || name === 'model') && this.model()[name].trim() === '') {
        return name === 'brand' ? 'Escribe la marca.' : 'Escribe el modelo.';
      }
      const client = this.form[name]().errors()[0]?.message;
      if (client) return client;
    }
    return this.serverErrors()[name] ?? null;
  }

  protected clearServerError(name: FieldName): void {
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

    if (FIELDS.some((name) => this.errorFor(name) !== null)) {
      this.focusFirstInvalid();
      return;
    }

    const asset = this.asset;
    const update = asset ? buildAssetUpdate(this.model(), this.baseline(), this.version) : null;
    if (asset && !update) return;

    this.busy.set(true);
    try {
      if (asset && update) {
        await firstValueFrom(this.api.update(asset.id, update));
        this.toast.success('Guardaste los cambios del equipo.');
        this.ref.close(true);
      } else {
        const created = await firstValueFrom(this.api.create(buildAssetCreate(this.model())));
        this.toast.success(`Registraste el equipo ${created.assetTag}.`);
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

    if (apiError.code === 'CONCURRENT_MODIFICATION' && this.asset) {
      await this.rebaseOnLatest(error, this.asset.id);
    } else if (apiError.code === 'DUPLICATE_SERIAL_NUMBER') {
      this.serverErrors.set({ serialNumber: describeError(error) });
      this.focusFirstInvalid();
    } else if (isStaleAssetError(apiError.code)) {
      this.toast.error(describeError(error));
      this.ref.close(true);
    } else {
      const fields = fieldErrorMessages(apiError);
      if (Object.keys(fields).length > 0) {
        this.serverErrors.set(fields as Partial<Record<FieldName, string>>);
        this.focusFirstInvalid();
      } else {
        this.formError.set(describeError(error));
      }
    }
  }

  /** Trae la versión actual del equipo y la fusiona con lo que la persona venía cambiando. */
  private async rebaseOnLatest(original: unknown, id: string): Promise<void> {
    try {
      const fresh = await firstValueFrom(this.api.get(id));
      if (!fresh.actions.edit) {
        this.toast.error('Ya no puedes editar este equipo.');
        this.ref.close(true);
        return;
      }
      const merged = rebaseAsset(this.model(), this.baseline(), formModelOf(fresh));
      this.version = fresh.version;
      this.baseline.set(merged.baseline);
      this.model.set(merged.model);
      this.submitted.set(false);
      this.conflict.set(true);
    } catch (error) {
      this.formError.set(
        describeError(isStaleAssetError(toApiError(error).code) ? error : original),
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
