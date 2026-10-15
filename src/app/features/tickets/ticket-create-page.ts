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
import { TicketPriority } from '@core/api/models';
import { HasUnsavedChanges } from '@core/auth/unsaved-changes.guard';
import { Button, Control, Field, Icon, PageHeader, ToastService } from '@shared/ui';
import { FormField, form, maxLength, minLength, required, disabled } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { TicketsApi } from '@core/api/tickets.api';
import { CatalogApi } from '@core/api/catalog.api';
import { loadable } from '@core/http/loadable';
import { PRIORITY_ORDER, TICKET_PRIORITY } from '@shared/domain';
import { describeError, fieldErrorMessages } from '@core/api/error-messages';
import { toApiError } from '@core/api/api-error';
import { firstValueFrom } from 'rxjs';

const TITLE_MAX = 200;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 5000;
type FieldName = 'title' | 'categoryId' | 'priority' | 'assetId' | 'description';

interface NewTicketModel {
  title: string;
  categoryId: string;
  priority: TicketPriority;
  assetId: string;
  description: string;
}

const INITIAL: NewTicketModel = {
  title: '',
  categoryId: '',
  priority: 'MEDIUM',
  assetId: '',
  description: '',
};

@Component({
  selector: 'app-ticket-create-page',
  imports: [FormField, Field, Control, Button, Icon, PageHeader, RouterLink],
  templateUrl: './ticket-create-page.html',
  styleUrl: './ticket-create-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Cerrar o recargar la pestaña con un ticket a medias: el navegador pide confirmación
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class TicketCreatePage implements HasUnsavedChanges {
  private readonly api = inject(TicketsApi);
  private readonly catalog = inject(CatalogApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly categories = loadable(
    () => true,
    () => this.catalog.categories(),
  );
  protected readonly assets = loadable(
    () => true,
    () => this.catalog.myAssets(),
  );
  protected readonly categoryOptions = computed(() => this.categories.value() ?? []);
  protected readonly assetOptions = computed(() =>
    (this.assets.value() ?? []).map((asset) => ({
      id: asset.id,
      label: [asset.assetTag, [asset.brand, asset.model].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(' · '),
    })),
  );
  protected readonly categoriesFailed = computed(() => this.categories.state().status === 'error');
  protected readonly priorityOptions = PRIORITY_ORDER.map((value) => ({
    value,
    label: TICKET_PRIORITY[value].label,
  }));

  protected readonly model = signal<NewTicketModel>({ ...INITIAL });
  protected readonly form = form(this.model, (path) => {
    required(path.title, { message: 'Escribe un asunto.' });
    maxLength(path.title, TITLE_MAX, {
      message: `El asunto no puede superar los ${TITLE_MAX} caracteres.`,
    });
    required(path.categoryId, { message: 'Selecciona una categoría.' });
    required(path.priority, { message: 'Selecciona una prioridad.' });
    disabled(path.assetId, {
      when: () => this.assetOptions().length === 0,
    });
    required(path.description, { message: 'Describe el problema.' });
    minLength(path.description, DESCRIPTION_MIN, {
      message: `La descripción debe tener al menos ${DESCRIPTION_MIN} caracteres.`,
    });
    maxLength(path.description, DESCRIPTION_MAX, {
      message: `La descripción no puede superar los ${DESCRIPTION_MAX} caracteres.`,
    });
  });

  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverErrors = signal<Partial<Record<FieldName, string>>>({});
  protected readonly formError = signal<string | null>(null);
  private saved = false;

  protected readonly descriptionLength = computed(() => this.model().description.length);

  private readonly fieldNames: readonly FieldName[] = [
    'title',
    'categoryId',
    'priority',
    'description',
  ];

  protected readonly errorCount = computed(() =>
    this.submitted() ? this.fieldNames.filter((name) => this.errorFor(name) !== null).length : 0,
  );
  protected readonly errorSummary = computed(() => {
    const count = this.errorCount();
    return count === 0
      ? null
      : count === 1
        ? 'Hay 1 campo por corregir.'
        : `Hay ${count} campos por corregir.`;
  });

  hasUnsavedChanges(): boolean {
    if (this.saved) return false;
    const m = this.model();
    return (
      m.title.trim() !== '' ||
      m.description.trim() !== '' ||
      m.categoryId !== '' ||
      m.assetId !== '' ||
      m.priority !== INITIAL.priority
    );
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  /** El mensaje de un campo, o null. Los errores del cliente salen tras tocar el campo o intentar enviar. */
  protected errorFor(name: FieldName): string | null {
    const state = this.form[name]();
    if (this.submitted() || state.touched()) {
      // Un texto de solo espacios cuenta como vacío: el backend también lo rechazaría
      if ((name === 'title' || name === 'description') && this.model()[name].trim() === '') {
        return name === 'title' ? 'Escribe un asunto.' : 'Describe el problema.';
      }
      const client = state.errors()[0]?.message;
      if (client) return client;
    }
    return this.serverErrors()[name] ?? null;
  }

  protected clearServerError(name: FieldName): void {
    if (this.serverErrors()[name]) {
      this.serverErrors.update((errors) => ({ ...errors, [name]: undefined }));
    }
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    this.submitted.set(true);
    this.serverErrors.set({});
    this.formError.set(null);

    if (this.fieldNames.some((name) => this.errorFor(name) !== null)) {
      this.focusFirstInvalid();
      return;
    }

    this.busy.set(true);
    const m = this.model();
    try {
      const ticket = await firstValueFrom(
        this.api.create({
          title: m.title.trim(),
          description: m.description.trim(),
          categoryId: m.categoryId,
          priority: m.priority,
          assetId: m.assetId || null,
        }),
      );
      this.saved = true; // ya no hay nada sin guardar: la salida no debe preguntar
      this.toast.success(`Creaste el ticket ${ticket.ticketCode}.`);
      await this.router.navigate(['/tickets', ticket.id]);
    } catch (error) {
      const fields = fieldErrorMessages(toApiError(error));
      if (Object.keys(fields).length > 0) {
        this.serverErrors.set(fields as Partial<Record<FieldName, string>>);
        this.focusFirstInvalid();
      } else {
        this.formError.set(describeError(error));
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected reloadCatalogs(): void {
    this.categories.reload();
    this.assets.reload();
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }
}
