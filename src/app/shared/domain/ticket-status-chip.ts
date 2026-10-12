import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TicketStatus } from '@core/api/models';
import { Chip } from '@shared/ui';
import { TICKET_STATUS } from './labels';

@Component({
  selector: 'app-ticket-status',
  imports: [Chip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-chip [tone]="meta().tone" [voided]="!!meta().voided">{{
    meta().label
  }}</app-chip>`,
})
export class TicketStatusChip {
  readonly status = input.required<TicketStatus>();
  protected readonly meta = computed(() => TICKET_STATUS[this.status()]);
}
