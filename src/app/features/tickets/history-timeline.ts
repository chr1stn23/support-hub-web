import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Time } from '@shared/ui';
import { TicketHistoryEvent } from '@core/api/models';
import { describeEvent } from '@features/tickets/history-text';

/** Línea de tiempo vertical. Recibe los eventos en orden cronológico y muestra el más reciente primero. */
@Component({
  selector: 'app-history-timeline',
  imports: [Time],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="timeline">
      @for (item of items(); track item.event.id) {
        <li class="item">
          <span class="dot" aria-hidden="true"></span>
          <p class="summary">{{ item.text.summary }}</p>
          @if (item.text.detail) {
            <p class="detail">{{ item.text.detail }}</p>
          }
          @if (item.text.note) {
            <p class="note">“{{ item.text.note }}”</p>
          }
          <app-time class="when" [value]="item.event.createdAt" />
        </li>
      } @empty {
        <li class="empty">Sin actividad registrada.</li>
      }
    </ol>
  `,
  styles: `
    .timeline {
      position: relative;
      display: grid;
      gap: var(--space-4);
      padding: 0;
      margin: 0;
      list-style: none;
    }
    .timeline::before {
      content: '';
      position: absolute;
      top: 0.5rem;
      bottom: 0.5rem;
      left: 0.3125rem;
      width: 1px;
      background: var(--color-border);
    }
    .item {
      position: relative;
      padding-left: var(--space-6);
    }
    .dot {
      position: absolute;
      top: 0.4rem;
      left: 0;
      width: 0.625rem;
      height: 0.625rem;
      background: var(--color-bg);
      border: 2px solid var(--color-border-strong);
      border-radius: var(--radius-full);
    }
    .item:first-child .dot {
      background: var(--color-accent);
      border-color: var(--color-accent);
    }
    .summary {
      font-size: var(--text-md);
    }
    .detail,
    .when {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }
    .note {
      margin-top: var(--space-1);
      font-size: var(--text-sm);
      font-style: italic;
      white-space: pre-wrap;
      color: var(--color-text-secondary);
    }
    .empty {
      color: var(--color-text-secondary);
    }
  `,
})
export class HistoryTimeline {
  readonly events = input.required<readonly TicketHistoryEvent[]>();

  protected readonly items = computed(() =>
    [...this.events()].reverse().map((event) => ({ event, text: describeEvent(event) })),
  );
}
