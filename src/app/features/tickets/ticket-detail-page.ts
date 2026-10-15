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
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  Time,
  ToastService,
} from '@shared/ui';
import { PriorityBadge, TicketStatusChip } from '@shared/domain';
import { CommentForm } from '@features/tickets/comment-form';
import { HistoryTimeline } from '@features/tickets/history-timeline';
import { TicketsApi } from '@core/api/tickets.api';
import { Title } from '@angular/platform-browser';
import { loadable } from '@core/http/loadable';
import { firstValueFrom, map } from 'rxjs';
import { describeError } from '@core/api/error-messages';

@Component({
  selector: 'app-ticket-detail-page',
  imports: [
    RouterLink,
    Avatar,
    Button,
    Chip,
    EmptyState,
    ErrorState,
    Icon,
    Skeleton,
    Time,
    TicketStatusChip,
    PriorityBadge,
    CommentForm,
    HistoryTimeline,
  ],
  templateUrl: './ticket-detail-page.html',
  styleUrl: './ticket-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketDetailPage {
  /** Llega de la ruta /tickets/:id (withComponentInputBinding). */
  readonly id = input.required<string>();

  private readonly api = inject(TicketsApi);
  private readonly toast = inject(ToastService);
  private readonly title = inject(Title);

  protected readonly ticket = loadable(
    () => this.id(),
    (id) => this.api.get(id),
  );
  // Cada carga recuerda PARA QUÉ ticket se hizo: así nunca se muestra, ni un instante, lo del ticket anterior
  protected readonly comments = loadable(
    () => this.id(),
    (id) => this.api.comments(id).pipe(map((items) => ({ id, items }))),
  );
  protected readonly history = loadable(
    () => this.id(),
    (id) => this.api.history(id).pipe(map((events) => ({ id, events }))),
  );

  protected readonly view = computed(() => {
    const ticket = this.ticket.value();
    return ticket && ticket.id === this.id() ? ticket : null;
  });
  protected readonly commentList = computed(() => {
    const loaded = this.comments.value();
    return loaded && loaded.id === this.id() ? loaded.items : null;
  });
  protected readonly historyList = computed(() => {
    const loaded = this.history.value();
    return loaded && loaded.id === this.id() ? loaded.events : null;
  });

  protected readonly ticketError = computed(() => {
    const state = this.ticket.state();
    return state.status === 'error' ? state.error : null;
  });
  /** El backend responde 404 también cuando no tienes permiso; un id mal formado da 400. */
  protected readonly notFound = computed(() => {
    const error = this.ticketError();
    return error !== null && (error.status === 404 || error.status === 400);
  });
  protected readonly commentsFailed = computed(() => this.comments.state().status === 'error');
  protected readonly historyFailed = computed(() => this.history.state().status === 'error');

  protected readonly taking = signal(false);
  protected readonly takeLabel = computed(() =>
    this.view()?.agent ? 'Asignármelo' : 'Tomar ticket',
  );

  constructor() {
    effect(() => {
      const ticket = this.view();
      if (ticket) {
        this.title.setTitle(`${ticket.ticketCode} · SupportHub`);
      }
    });
  }

  protected async take(): Promise<void> {
    const ticket = this.view();
    if (!ticket || this.taking()) {
      return;
    }
    this.taking.set(true);
    try {
      await firstValueFrom(this.api.take(ticket.id));
      this.toast.success(`Tomaste el ticket ${ticket.ticketCode}.`);
    } catch (error) {
      this.toast.error(describeError(error));
    } finally {
      this.taking.set(false);
      this.refreshTicket(); // salga como salga, la pantalla debe reflejar la realidad
    }
  }

  protected refreshTicket(): void {
    this.ticket.reload();
    this.history.reload();
  }

  protected reloadAll(): void {
    this.refreshTicket();
    this.comments.reload();
  }
}
