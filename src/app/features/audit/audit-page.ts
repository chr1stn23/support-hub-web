import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuditApi } from '@core/api/audit.api';
import type { AuditLogEntry } from '@core/api/models';
import { loadable } from '@core/http/loadable';
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Pagination,
  Skeleton,
  absoluteDateTime,
  relativeTime,
  type Tone,
} from '@shared/ui';
import {
  AUDIT_AREAS,
  AUDIT_RESULTS,
  AUDIT_SIZE_OPTIONS,
  AuditListState,
  RawAuditParams,
  dateRangeProblem,
  hasActiveAuditFilters,
  parseAuditState,
  toAuditApiQuery,
  toAuditUrlParams,
} from './audit-query';
import { AUDIT_ACTION_GROUPS, AUDIT_ACTION_LABEL, describeAudit } from './audit-text';

@Component({
  selector: 'app-audit-page',
  imports: [
    RouterLink,
    PageHeader,
    Avatar,
    Button,
    Chip,
    EmptyState,
    ErrorState,
    Icon,
    Pagination,
    Skeleton,
  ],
  templateUrl: './audit-page.html',
  styleUrl: './audit-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditPage {
  readonly accion = input<string>();
  readonly area = input<string>();
  readonly resultado = input<string>();
  readonly persona = input<string>();
  readonly desde = input<string>();
  readonly hasta = input<string>();
  readonly pagina = input<string>();
  readonly tamano = input<string>();

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AuditApi);

  protected readonly actionGroups = AUDIT_ACTION_GROUPS;
  protected readonly actionLabel = AUDIT_ACTION_LABEL;
  protected readonly areas = AUDIT_AREAS;
  protected readonly results = AUDIT_RESULTS;
  protected readonly sizeOptions = AUDIT_SIZE_OPTIONS;

  protected readonly state = computed<AuditListState>(() => {
    const raw: RawAuditParams = {
      accion: this.accion(),
      area: this.area(),
      resultado: this.resultado(),
      persona: this.persona(),
      desde: this.desde(),
      hasta: this.hasta(),
      pagina: this.pagina(),
      tamano: this.tamano(),
    };
    return parseAuditState(raw);
  });
  protected readonly hasFilters = computed(() => hasActiveAuditFilters(this.state()));
  protected readonly dateProblem = computed(() => dateRangeProblem(this.state()));

  protected readonly list = loadable(
    () => toAuditApiQuery(this.state()),
    (query) => this.api.list(query),
  );
  protected readonly page = this.list.value;
  protected readonly loading = computed(() => this.list.state().status === 'loading');
  protected readonly error = computed(() => {
    const state = this.list.state();
    return state.status === 'error' ? state.error : null;
  });

  protected readonly rows = computed(
    () => this.page()?.content.map((entry) => ({ entry, text: describeAudit(entry) })) ?? null,
  );
  protected readonly announcement = computed(() => {
    const data = this.page();
    return data && !this.loading() ? `${data.totalElements} registros encontrados` : '';
  });

  /** El nombre de la persona del filtro, tomado de los propios registros (todos son suyos). */
  protected readonly actorName = computed(() => {
    const id = this.state().actorId;
    if (!id) return null;
    return (
      this.page()?.content.find((entry) => entry.actor?.id === id)?.actor?.fullName ?? 'una persona'
    );
  });

  protected exact(iso: string): string {
    return absoluteDateTime(iso);
  }

  protected relative(iso: string): string {
    return relativeTime(iso);
  }

  protected resultLabel(entry: AuditLogEntry): string {
    return entry.result === 'SUCCESS'
      ? 'Correcto'
      : entry.result === 'FAILURE'
        ? 'Fallido'
        : entry.result;
  }

  protected resultTone(entry: AuditLogEntry): Tone {
    return entry.result === 'SUCCESS'
      ? 'success'
      : entry.result === 'FAILURE'
        ? 'danger'
        : 'neutral-soft';
  }

  /** Los parámetros para ver solo la actividad de una persona, conservando el resto de los filtros. */
  protected actorParams(actorId: string): Record<string, string> {
    return toAuditUrlParams({ ...this.state(), actorId, page: 0 });
  }

  protected setAction(event: Event): void {
    this.navigate({
      action: (event.target as HTMLSelectElement).value as AuditListState['action'],
      page: 0,
    });
  }

  protected setArea(event: Event): void {
    this.navigate({
      area: (event.target as HTMLSelectElement).value as AuditListState['area'],
      page: 0,
    });
  }

  protected setResult(event: Event): void {
    this.navigate({
      result: (event.target as HTMLSelectElement).value as AuditListState['result'],
      page: 0,
    });
  }

  protected setDay(which: 'from' | 'to', event: Event): void {
    this.navigate({ [which]: (event.target as HTMLInputElement).value, page: 0 });
  }

  protected clearActor(): void {
    this.navigate({ actorId: '', page: 0 });
  }

  protected clearFilters(): void {
    this.navigate({ action: '', area: '', result: '', actorId: '', from: '', to: '', page: 0 });
  }

  protected onPage(page: number): void {
    this.navigate({ page });
  }

  protected onSize(size: number): void {
    this.navigate({ size, page: 0 });
  }

  private navigate(patch: Partial<AuditListState>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toAuditUrlParams({ ...this.state(), ...patch }),
    });
  }
}
