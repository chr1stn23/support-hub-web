import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, Control, DialogFrame, Field, Icon, ToastService } from '@shared/ui';
import { TicketDialogData } from '@features/tickets/ticket-dialog-data';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TicketsApi } from '@core/api/tickets.api';
import { statusAction } from '@features/tickets/status-actions';
import { TicketStatus } from '@core/api/models';
import { firstValueFrom } from 'rxjs';
import { isStaleTicketError } from '@features/tickets/ticket-errors';
import { toApiError } from '@core/api/api-error';
import { describeError } from '@core/api/error-messages';
import { TICKET_STATUS } from '@shared/domain';

const NOTE_MAX = 500;

@Component({
  selector: 'app-status-dialog',
  imports: [DialogFrame, Button, Field, Control, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-frame title="Cambiar estado" (closed)="ref.close(false)">
      <form id="status-form" class="form" (submit)="submit($event)" novalidate>
        <fieldset class="options">
          <legend class="legend">Nuevo estado</legend>
          @for (option of options; track option.status) {
            <label class="option" [class.is-selected]="selected() === option.status">
              <input
                type="radio"
                name="status"
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

        <app-field
          label="Nota"
          [hint]="noteHint()"
          [error]="noteError()"
          [required]="noteRequired()"
        >
          <textarea
            appControl
            rows="3"
            [value]="note()"
            (input)="note.set($any($event.target).value)"
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
          form="status-form"
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
export class StatusDialog {
  private readonly data = inject<TicketDialogData>(DIALOG_DATA);
  private readonly api = inject(TicketsApi);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);

  private readonly ticket = this.data.ticket;
  protected readonly options = this.ticket.actions.changeStatus.map((option) => ({
    ...option,
    text: statusAction(this.ticket.status, option.status),
  }));

  protected readonly selected = signal<TicketStatus | null>(
    this.options.length === 1 ? this.options[0].status : null,
  );
  protected readonly note = signal('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);

  private readonly current = computed(
    () => this.options.find((o) => o.status === this.selected()) ?? null,
  );
  protected readonly noteRequired = computed(() => this.current()?.noteRequired ?? false);
  protected readonly destructive = computed(() => this.current()?.text.destructive ?? false);

  protected readonly noteHint = computed(() =>
    this.noteRequired()
      ? 'Obligatoria al reabrir: explica por qué sigue sin resolverse.'
      : 'Opcional. Quedará en el historial del ticket.',
  );
  protected readonly selectionError = computed(() =>
    this.submitted() && !this.current() ? 'Selecciona el nuevo estado.' : null,
  );
  protected readonly noteError = computed(() => {
    if (!this.submitted()) return null;
    const length = this.note().trim().length;
    if (this.noteRequired() && length === 0) return 'Escribe una nota explicando el motivo.';
    return length > NOTE_MAX ? `La nota no puede superar los ${NOTE_MAX} caracteres.` : null;
  });

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    this.submitted.set(true);
    this.serverError.set(null);
    const option = this.current();
    if (!option || this.noteError()) return;

    this.busy.set(true);
    try {
      const note = this.note().trim();
      await firstValueFrom(
        this.api.changeStatus(this.ticket.id, { status: option.status, note: note || null }),
      );
      this.toast.success(
        `El ticket ${this.ticket.ticketCode} ahora está «${TICKET_STATUS[option.status].label}».`,
      );
      this.ref.close(true);
    } catch (error) {
      if (isStaleTicketError(toApiError(error).code)) {
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
