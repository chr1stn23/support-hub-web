import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, Control, DialogFrame, Field, Icon, ToastService } from '@shared/ui';
import { PersonPicker } from '@shared/domain';
import { AssetAssignDialogData } from '@features/assets/asset-dialog-data';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { AssetsApi } from '@core/api/assets.api';
import { UserLookup } from '@core/api/models';
import { firstValueFrom } from 'rxjs';
import { isStaleAssetError } from '@features/assets/asset-errors';
import { toApiError } from '@core/api/api-error';
import { describeError } from '@core/api/error-messages';

const NOTES_MAX = 500;

@Component({
  selector: 'app-asset-assign-dialog',
  imports: [DialogFrame, Button, Field, Control, Icon, PersonPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-frame [title]="title" (closed)="ref.close(false)">
      <form id="asset-assign-form" class="form" (submit)="submit($event)" novalidate>
        @if (holderHint) {
          <p class="hint">{{ holderHint }}</p>
        }

        <app-person-picker
          [label]="transferring ? 'Transferir a' : 'Asignar a'"
          [required]="true"
          [excludeId]="holderId"
          [error]="selectionError()"
          [(selected)]="person"
        />

        <app-field
          label="Nota"
          hint="Opcional. Queda en el historial de asignaciones."
          [error]="notesError()"
        >
          <textarea
            appControl
            rows="3"
            [value]="notes()"
            (input)="notes.set($any($event.target).value)"
          ></textarea>
        </app-field>

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
          form="asset-assign-form"
          variant="primary"
          [loading]="busy()"
        >
          {{ transferring ? 'Transferir' : 'Asignar' }}
        </button>
      </div>
    </app-dialog-frame>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--space-4);
    }
    .hint {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
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
export class AssetAssignDialog {
  private readonly data = inject<AssetAssignDialogData>(DIALOG_DATA);
  private readonly api = inject(AssetsApi);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);

  private readonly asset = this.data.asset;
  protected readonly transferring = this.data.mode === 'transfer';
  protected readonly title = this.transferring ? 'Transferir equipo' : 'Asignar equipo';
  /** Transferir al responsable actual no tendría sentido (y el backend lo rechaza). */
  protected readonly holderId = this.transferring ? (this.asset.assignedTo?.id ?? null) : null;
  protected readonly holderHint =
    this.transferring && this.asset.assignedTo
      ? `Ahora lo tiene ${this.asset.assignedTo.fullName}.`
      : null;

  protected readonly person = signal<UserLookup | null>(null);
  protected readonly notes = signal('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly selectionError = computed(() =>
    this.submitted() && !this.person()
      ? this.transferring
        ? 'Selecciona a quién transferirlo.'
        : 'Selecciona a quién asignarlo.'
      : null,
  );
  protected readonly notesError = computed(() =>
    this.submitted() && this.notes().trim().length > NOTES_MAX
      ? `La nota no puede superar los ${NOTES_MAX} caracteres.`
      : null,
  );

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    this.submitted.set(true);
    this.serverError.set(null);
    const person = this.person();
    if (!person || this.notesError()) return;

    this.busy.set(true);
    try {
      const request = { userId: person.id, notes: this.notes().trim() || null };
      await firstValueFrom(
        this.transferring
          ? this.api.transfer(this.asset.id, request)
          : this.api.assign(this.asset.id, request),
      );
      this.toast.success(
        this.transferring
          ? `Transferiste el equipo ${this.asset.assetTag} a ${person.fullName}.`
          : `Asignaste el equipo ${this.asset.assetTag} a ${person.fullName}.`,
      );
      this.ref.close(true);
    } catch (error) {
      if (isStaleAssetError(toApiError(error).code)) {
        this.toast.error(describeError(error));
        this.ref.close(true); // la pantalla se recarga y vuelve a decir la verdad
      } else {
        this.serverError.set(describeError(error));
        this.person.set(null); // la persona elegida no sirve: que elija otra
      }
    } finally {
      this.busy.set(false);
    }
  }
}
