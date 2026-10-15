import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { Button, Control, Field, ToastService } from '@shared/ui';
import { TicketsApi } from '@core/api/tickets.api';
import { TicketComment } from '@core/api/models';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '@core/api/api-error';
import { describeError, fieldErrorMessages } from '@core/api/error-messages';

const MAX_LENGTH = 2000;
const COUNTER_FROM = 1800;

@Component({
  selector: 'app-comment-form',
  imports: [FormField, Field, Control, Button],
  templateUrl: './comment-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .form {
      display: grid;
      gap: var(--space-2);
    }

    .foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }
  `,
})
export class CommentForm {
  private readonly api = inject(TicketsApi);
  private readonly toast = inject(ToastService);

  readonly ticketId = input.required<string>();
  /** Se publicó un comentario: la pantalla debe recargar la lista. */
  readonly posted = output<TicketComment>();
  /** El servidor dijo que el ticket ya no admite comentarios: la pantalla debe recargar el ticket. */
  readonly locked = output<void>();

  protected readonly model = signal({ body: '' });
  protected readonly form = form(this.model, (path) => {
    required(path.body, { message: 'Escribe un comentario.' });
    maxLength(path.body, MAX_LENGTH, {
      message: `El comentario no puede superar los ${MAX_LENGTH} caracteres.`,
    });
  });

  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly error = computed(() => {
    if (!this.submitted()) {
      return null;
    }
    // Un texto de solo espacios cuenta como vacío: el backend también lo rechazaría
    if (this.model().body.trim() === '') {
      return 'Escribe un comentario.';
    }
    return this.form.body().errors()[0]?.message ?? this.serverError();
  });

  protected readonly counter = computed(() => {
    const length = this.model().body.length;
    return length >= COUNTER_FROM ? `${length} / ${MAX_LENGTH}` : null;
  });

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) {
      return;
    }
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.error() !== null) {
      return;
    }

    this.busy.set(true);
    try {
      const comment = await firstValueFrom(
        this.api.addComment(this.ticketId(), this.model().body.trim()),
      );
      this.model.set({ body: '' });
      this.submitted.set(false);
      this.posted.emit(comment);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === 'TICKET_LOCKED') {
        this.toast.error(describeError(error));
        this.locked.emit();
      } else if (fieldErrorMessages(apiError)['body']) {
        this.serverError.set(fieldErrorMessages(apiError)['body']);
      } else {
        this.toast.error(describeError(error));
      }
    } finally {
      this.busy.set(false);
    }
  }
}
