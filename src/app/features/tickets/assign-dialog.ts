import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  Button,
  Control,
  DialogFrame,
  ErrorState,
  Field,
  Icon,
  Skeleton,
  ToastService,
} from '@shared/ui';
import { TicketDialogData } from '@features/tickets/ticket-dialog-data';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TicketsApi } from '@core/api/tickets.api';
import { UsersApi } from '@core/api/users.api';
import { loadable } from '@core/http/loadable';
import { firstValueFrom } from 'rxjs';
import { isStaleTicketError } from '@features/tickets/ticket-errors';
import { toApiError } from '@core/api/api-error';
import { describeError } from '@core/api/error-messages';

@Component({
  selector: 'app-assign-dialog',
  imports: [DialogFrame, Button, Field, Control, Icon, ErrorState, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog-frame title="Asignar ticket" (closed)="ref.close(false)">
      @if (agentsFailed()) {
        <app-error-state title="No pudimos cargar a las personas" (retry)="agents.reload()" />
      } @else if (agents.value() === null) {
        <div role="status" aria-label="Cargando personas"><app-skeleton [lines]="2" /></div>
      } @else if (options().length === 0) {
        <p class="empty">No hay otras personas a quienes asignar este ticket.</p>
      } @else {
        <form id="assign-form" class="form" (submit)="submit($event)" novalidate>
          <app-field
            label="Asignar a"
            [hint]="currentHint"
            [error]="selectionError()"
            [required]="true"
          >
            <select appControl (change)="selected.set($any($event.target).value)">
              <option value="" [selected]="selected() === ''">Selecciona una persona</option>
              @for (agent of options(); track agent.id) {
                <option [value]="agent.id" [selected]="agent.id === selected()">
                  {{ agent.fullName }}
                </option>
              }
            </select>
          </app-field>

          @if (serverError(); as message) {
            <p class="callout" role="alert">
              <app-icon name="alert-triangle" [size]="16" />
              {{ message }}
            </p>
          }
        </form>
      }

      <div dialogFooter class="actions">
        <button appButton type="button" (click)="ref.close(false)">Cancelar</button>
        @if (options().length > 0) {
          <button appButton type="submit" form="assign-form" variant="primary" [loading]="busy()">
            Asignar
          </button>
        }
      </div>
    </app-dialog-frame>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--space-4);
    }
    .empty {
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
export class AssignDialog {
  private readonly data = inject<TicketDialogData>(DIALOG_DATA);
  private readonly api = inject(TicketsApi);
  private readonly users = inject(UsersApi);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);

  private readonly ticket = this.data.ticket;
  protected readonly agents = loadable(
    () => true,
    () => this.users.assignableAgents(),
  );
  protected readonly agentsFailed = computed(() => this.agents.state().status === 'error');
  /** Se excluye a quien ya lo tiene: asignárselo de nuevo no cambiaría nada. */
  protected readonly options = computed(() =>
    (this.agents.value() ?? []).filter((agent) => agent.id !== this.ticket.agent?.id),
  );
  protected readonly currentHint = this.ticket.agent
    ? `Ahora lo atiende ${this.ticket.agent.fullName}.`
    : null;

  protected readonly selected = signal('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly selectionError = computed(() =>
    this.submitted() && this.selected() === '' ? 'Selecciona a quién asignarlo.' : null,
  );

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    this.submitted.set(true);
    this.serverError.set(null);
    const agent = this.options().find((a) => a.id === this.selected());
    if (!agent) return;

    this.busy.set(true);
    try {
      await firstValueFrom(this.api.assignTo(this.ticket.id, agent.id));
      this.toast.success(`El ticket ${this.ticket.ticketCode} ahora lo atiende ${agent.fullName}.`);
      this.ref.close(true);
    } catch (error) {
      if (isStaleTicketError(toApiError(error).code)) {
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
