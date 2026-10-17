import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AssetAssignment } from '@core/api/models';
import { Chip, Time } from '@shared/ui';

/** Línea de tiempo vertical. Recibe las asignaciones del más reciente al más antiguo, como las manda el backend. */
@Component({
  selector: 'app-assignment-timeline',
  imports: [Chip, Time],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="timeline">
      @for (item of assignments(); track item.id) {
        <li class="item">
          <span class="dot" aria-hidden="true"></span>
          <p class="summary">
            <strong>{{ item.user.fullName }}</strong>
            @if (!item.returnedAt) {
              <app-chip tone="accent">Actual</app-chip>
            }
          </p>
          <p class="detail">
            Asignado por {{ item.assignedBy.fullName }} · <app-time [value]="item.assignedAt" />
          </p>
          @if (item.returnedAt; as returned) {
            <p class="detail">Devuelto <app-time [value]="returned" /></p>
          }
          @if (item.notes) {
            <p class="note">“{{ item.notes }}”</p>
          }
        </li>
      } @empty {
        <li class="empty">Este equipo todavía no se ha asignado a nadie.</li>
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
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      overflow-wrap: anywhere;
    }
    .detail {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }
    .note {
      margin-top: var(--space-1);
      font-size: var(--text-sm);
      font-style: italic;
      color: var(--color-text-secondary);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .empty {
      color: var(--color-text-secondary);
    }
  `,
})
export class AssignmentTimeline {
  readonly assignments = input.required<readonly AssetAssignment[]>();
}
