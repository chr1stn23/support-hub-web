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
import { FormField, form, maxLength, minLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';

import { toApiError } from '@core/api/api-error';
import { CatalogApi } from '@core/api/catalog.api';
import { describeError, fieldErrorMessages } from '@core/api/error-messages';
import { TicketsApi } from '@core/api/tickets.api';
import { loadable } from '@core/http/loadable';
import { PRIORITY_ORDER, TICKET_PRIORITY } from '@shared/domain';
import { Button, Control, DialogFrame, Field, Icon, ToastService } from '@shared/ui';
import { EditModel, buildUpdate, modelOf, rebase } from './edit-changes';
import type { TicketDialogData } from './ticket-dialog-data';
import { isStaleTicketError } from './ticket-errors';

type FieldName = keyof EditModel;

const TITLE_MAX = 200;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 5000;

@Component({
  selector: 'app-edit-ticket-dialog',
  imports: [FormField, DialogFrame, Button, Field, Control, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-frame title="Editar ticket" (closed)="ref.close(false)">
      <form id="edit-form" class="form" (submit)="submit($event)" novalidate>
        @if (conflict()) {
          <p class="callout callout--warning" role="alert">
            <app-icon name="alert-triangle" [size]="16" />
            Alguien más modificó este ticket mientras lo editabas. Actualizamos la información y
            conservamos tus cambios: revísalos y vuelve a guardar.
          </p>
        }
        @if (formError(); as message) {
          <p class="callout callout--error" role="alert">
            <app-icon name="alert-triangle" [size]="16" />
            {{ message }}
          </p>
        }

        <app-field label="Asunto" [error]="errorFor('title')" [required]="true">
          <input
            appControl
            type="text"
            autocomplete="off"
            [formField]="form.title"
            (input)="clearServerError('title')"
          />
        </app-field>

        @if (triage) {
          <div class="pair">
            <app-field
              label="Categoría"
              [hint]="
                categoriesFailed()
                  ? 'No pudimos cargar las demás categorías. Cierra y vuelve a abrir para reintentar.'
                  : null
              "
              [error]="errorFor('categoryId')"
              [required]="true"
            >
              <select
                appControl
                [formField]="form.categoryId"
                (change)="clearServerError('categoryId')"
              >
                @for (category of categoryOptions(); track category.id) {
                  <option [value]="category.id">{{ category.name }}</option>
                }
              </select>
            </app-field>
            <app-field label="Prioridad" [error]="errorFor('priority')" [required]="true">
              <select
                appControl
                [formField]="form.priority"
                (change)="clearServerError('priority')"
              >
                @for (option of priorityOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </app-field>
          </div>
        }

        <app-field label="Descripción" [error]="errorFor('description')" [required]="true">
          <textarea
            appControl
            rows="6"
            [formField]="form.description"
            (input)="clearServerError('description')"
          ></textarea>
        </app-field>
      </form>

      <div dialogFooter class="actions">
        <button appButton type="button" (click)="ref.close(false)">Cancelar</button>
        <button
          appButton
          type="submit"
          form="edit-form"
          variant="primary"
          [loading]="busy()"
          [disabled]="!dirty()"
        >
          Guardar cambios
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
export class EditTicketDialog {
  private readonly data = inject<TicketDialogData>(DIALOG_DATA);
  private readonly api = inject(TicketsApi);
  private readonly catalog = inject(CatalogApi);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);

  private readonly ticket = this.data.ticket;
  /** Prioridad, categoría y equipo solo los edita quien tiene el control del ticket. */
  protected readonly triage = this.ticket.actions.editTriage;
  protected readonly priorityOptions = PRIORITY_ORDER.map((value) => ({
    value,
    label: TICKET_PRIORITY[value].label,
  }));

  private readonly categories = loadable(
    () => this.triage,
    () => this.catalog.categories(),
  );
  protected readonly categoriesFailed = computed(() => this.categories.state().status === 'error');

  /** La categoría actual siempre está en la lista (aunque ya no esté activa), para que el selector la muestre desde el primer momento. */
  protected readonly categoryOptions = computed(() => {
    const loaded = this.categories.value() ?? [];
    return loaded.some((c) => c.id === this.ticket.category.id)
      ? loaded
      : [this.ticket.category, ...loaded];
  });

  private readonly baseline = signal<EditModel>(modelOf(this.ticket));
  private version = this.ticket.version;
  protected readonly model = signal<EditModel>({ ...modelOf(this.ticket) });
  protected readonly form = form(this.model, (path) => {
    required(path.title, { message: 'Escribe un asunto.' });
    maxLength(path.title, TITLE_MAX, {
      message: `El asunto no puede superar los ${TITLE_MAX} caracteres.`,
    });
    required(path.description, { message: 'Describe el problema.' });
    minLength(path.description, DESCRIPTION_MIN, {
      message: `La descripción debe tener al menos ${DESCRIPTION_MIN} caracteres.`,
    });
    maxLength(path.description, DESCRIPTION_MAX, {
      message: `La descripción no puede superar los ${DESCRIPTION_MAX} caracteres.`,
    });
    required(path.categoryId, { message: 'Selecciona una categoría.' });
    required(path.priority, { message: 'Selecciona una prioridad.' });
  });

  protected readonly dirty = computed(
    () => buildUpdate(this.model(), this.baseline(), this.version, this.triage) !== null,
  );

  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly conflict = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly serverErrors = signal<Partial<Record<FieldName, string>>>({});

  private get fieldNames(): readonly FieldName[] {
    return this.triage
      ? ['title', 'categoryId', 'priority', 'description']
      : ['title', 'description'];
  }

  protected errorFor(name: FieldName): string | null {
    if (this.submitted()) {
      // Un texto de solo espacios cuenta como vacío: el backend también lo rechazaría
      if ((name === 'title' || name === 'description') && this.model()[name].trim() === '') {
        return name === 'title' ? 'Escribe un asunto.' : 'Describe el problema.';
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

    if (this.fieldNames.some((name) => this.errorFor(name) !== null)) {
      this.focusFirstInvalid();
      return;
    }
    const update = buildUpdate(this.model(), this.baseline(), this.version, this.triage);
    if (!update) return;

    this.busy.set(true);
    try {
      await firstValueFrom(this.api.update(this.ticket.id, update));
      this.toast.success('Guardaste los cambios del ticket.');
      this.ref.close(true);
    } catch (error) {
      await this.handleFailure(error);
    } finally {
      this.busy.set(false);
    }
  }

  private async handleFailure(error: unknown): Promise<void> {
    const apiError = toApiError(error);

    if (apiError.code === 'CONCURRENT_MODIFICATION') {
      await this.rebaseOnLatest(error);
    } else if (isStaleTicketError(apiError.code)) {
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

  /** Trae la versión actual del ticket y la fusiona con lo que la persona venía cambiando. */
  private async rebaseOnLatest(original: unknown): Promise<void> {
    try {
      const fresh = await firstValueFrom(this.api.get(this.ticket.id));
      if (!fresh.actions.editContent) {
        this.toast.error('Ya no puedes editar este ticket.');
        this.ref.close(true);
        return;
      }
      const merged = rebase(this.model(), this.baseline(), modelOf(fresh));
      this.version = fresh.version;
      this.baseline.set(merged.baseline);
      this.model.set(merged.model);
      this.submitted.set(false);
      this.conflict.set(true);
    } catch (error) {
      this.formError.set(
        describeError(isStaleTicketError(toApiError(error).code) ? error : original),
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
