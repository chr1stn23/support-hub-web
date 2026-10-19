import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { DashboardApi } from '@core/api/dashboard.api';
import type {
  ActivityItem,
  AssetStatus,
  TicketEventType,
  TicketHistoryEvent,
  TicketStatus,
} from '@core/api/models';
import { loadable } from '@core/http/loadable';
import {
  ASSET_STATUS_ORDER,
  AssetStatusChip,
  TICKET_STATUS_ORDER,
  TicketStatusChip,
} from '@shared/domain';
import { Button, ErrorState, PageHeader, Skeleton, Time } from '@shared/ui';
import { ASSET_VIEWS } from '../assets/asset-query';
import { describeEvent } from '../tickets/history-text';
import { buildCards } from './dashboard-cards';
import { buildTrendChart } from './dashboard-chart';
import {
  PERIOD_OPTIONS,
  formatCount,
  parseDays,
  percentOf,
  toDashboardUrlParams,
} from './dashboard-format';

const TOP_CATEGORIES = 8;

/** Un evento reciente tiene la misma forma que una entrada del historial: así se reutilizan sus frases. */
function asHistoryEvent(item: ActivityItem, index: number): TicketHistoryEvent {
  return {
    id: `${item.ticketId}-${index}`,
    eventType: item.eventType as TicketEventType,
    actor: item.actor ?? { id: '', fullName: 'Alguien' },
    oldValue: item.oldValue,
    newValue: item.newValue,
    note: item.note,
    createdAt: item.at,
  };
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    PageHeader,
    Button,
    ErrorState,
    Skeleton,
    Time,
    TicketStatusChip,
    AssetStatusChip,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly dias = input<string>();

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(DashboardApi);

  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly days = computed(() => parseDays(this.dias()));

  protected readonly report = loadable(
    () => this.days(),
    (days) => this.api.report(days),
  );
  protected readonly data = this.report.value;
  protected readonly loading = computed(() => this.report.state().status === 'loading');
  protected readonly error = computed(() => {
    const state = this.report.state();
    return state.status === 'error' ? state.error : null;
  });

  protected readonly description = computed(() => {
    const scope = this.data()?.scope;
    return scope === 'OWN'
      ? 'Tus tickets de un vistazo.'
      : scope === 'ALL'
        ? 'El estado de la operación de un vistazo.'
        : '';
  });

  protected readonly cards = computed(() => {
    const data = this.data();
    return data ? buildCards(data) : [];
  });

  protected readonly chart = computed(() => {
    const data = this.data();
    return data ? buildTrendChart(data.tickets.trend) : null;
  });
  protected readonly chartLabel = computed(() => {
    const data = this.data();
    const chart = this.chart();
    return data && chart
      ? `Tickets creados y resueltos por día en los últimos ${data.period.days} días. En total: ${formatCount(chart.totalCreated)} creados y ${formatCount(chart.totalResolved)} resueltos.`
      : '';
  });

  protected readonly statusRows = computed(() => {
    const data = this.data();
    if (!data) return [];
    const counts = data.tickets.byStatus as Partial<Record<TicketStatus, number>>;
    const max = Math.max(0, ...TICKET_STATUS_ORDER.map((status) => counts[status] ?? 0));
    return TICKET_STATUS_ORDER.map((status) => ({
      status,
      count: counts[status] ?? 0,
      percent: percentOf(counts[status] ?? 0, max),
    }));
  });

  protected readonly categoryRows = computed(() => {
    const rows = [...(this.data()?.tickets.byCategory ?? [])]
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_CATEGORIES);
    const max = Math.max(0, ...rows.map((row) => row.count));
    return rows.map((row) => ({ ...row, percent: percentOf(row.count, max) }));
  });

  /** Los equipos solo llegan a quien puede ver el inventario. */
  protected readonly assets = computed(() => this.data()?.assets ?? null);
  protected readonly assetRows = computed(() => {
    const assets = this.assets();
    if (!assets) return [];
    const counts = assets.byStatus as Partial<Record<AssetStatus, number>>;
    const max = Math.max(0, ...ASSET_STATUS_ORDER.map((status) => counts[status] ?? 0));
    return ASSET_STATUS_ORDER.map((status) => ({
      status,
      count: counts[status] ?? 0,
      percent: percentOf(counts[status] ?? 0, max),
      view: ASSET_VIEWS.find((view) => view.status === status)?.id ?? 'todos',
    }));
  });
  protected readonly typeRows = computed(() => {
    const rows = [...(this.assets()?.byType ?? [])].sort((a, b) => b.count - a.count);
    const max = Math.max(0, ...rows.map((row) => row.count));
    return rows.map((row) => ({ ...row, percent: percentOf(row.count, max) }));
  });

  protected readonly activity = computed(() =>
    (this.data()?.recentActivity ?? []).map((item, index) => ({
      item,
      text: describeEvent(asHistoryEvent(item, index)),
    })),
  );

  protected format(value: number): string {
    return formatCount(value);
  }

  protected setDays(event: Event): void {
    const days = Number((event.target as HTMLSelectElement).value);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toDashboardUrlParams(days),
    });
  }

  protected refresh(): void {
    this.report.reload();
  }
}
