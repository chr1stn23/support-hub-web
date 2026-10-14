import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Pagination,
  Skeleton,
  SortHeader,
  SortState,
  Time,
  ToastService,
} from '@shared/ui';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { PRIORITY_ORDER, PriorityBadge, TICKET_PRIORITY, TicketStatusChip } from '@shared/domain';
import { AuthService } from '@core/auth/auth.service';
import { TicketsApi } from '@core/api/tickets.api';
import {
  hasActiveFilters,
  ListState,
  parseListState,
  RawListParams,
  SIZE_OPTIONS,
  TicketView,
  toApiQuery,
  toUrlParams,
  viewCount,
  viewsFor,
} from './ticket-query';
import { CatalogApi } from '@core/api/catalog.api';
import { loadable } from '@core/http/loadable';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, firstValueFrom, skip } from 'rxjs';
import { TicketSummary } from '@core/api/models';
import { describeError } from '@core/api/error-messages';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-ticket-list-page',
  imports: [
    RouterLink,
    PageHeader,
    Button,
    Icon,
    Avatar,
    Time,
    EmptyState,
    ErrorState,
    Skeleton,
    Pagination,
    SortHeader,
    TicketStatusChip,
    PriorityBadge,
  ],
  templateUrl: './ticket-list-page.html',
  styleUrl: './ticket-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketListPage {
  // Los parámetros de la URL llegan como entradas (withComponentInputBinding)
  readonly vista = input<string>();
  readonly buscar = input<string>();
  readonly categoria = input<string>();
  readonly prioridad = input<string>();
  readonly pagina = input<string>();
  readonly tamano = input<string>();
  readonly orden = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(TicketsApi);
  private readonly toast = inject(ToastService);

  protected readonly canViewAll = computed(() => this.auth.hasAnyRole(['ADMIN', 'AGENT']));
  protected readonly views = computed(() => viewsFor(this.canViewAll()));
  protected readonly sizeOptions = SIZE_OPTIONS;
  protected readonly priorityOptions = PRIORITY_ORDER.map((value) => ({
    value,
    label: TICKET_PRIORITY[value].label,
  }));

  protected readonly state = computed<ListState>(() => {
    const raw: RawListParams = {
      vista: this.vista(),
      buscar: this.buscar(),
      categoria: this.categoria(),
      prioridad: this.prioridad(),
      pagina: this.pagina(),
      tamano: this.tamano(),
      orden: this.orden(),
    };
    return parseListState(raw, this.canViewAll());
  });
  protected readonly hasFilters = computed(() => hasActiveFilters(this.state()));

  // Datos
  private readonly catalog = inject(CatalogApi);
  protected readonly list = loadable(
    () => toApiQuery(this.state(), this.auth.user()?.id ?? ''),
    (query) => this.api.list(query),
  );
  protected readonly categories = loadable(
    () => true,
    () => this.catalog.categories(),
  );
  protected readonly summary = loadable(
    () => true,
    () => this.catalog.dashboardSummary(),
  );

  protected readonly page = this.list.value;
  protected readonly loading = computed(() => this.list.state().status === 'loading');
  protected readonly error = computed(() => {
    const state = this.list.state();
    return state.status === 'error' ? state.error : null;
  });
  protected readonly categoryOptions = computed(() => this.categories.value() ?? []);

  protected readonly description = computed(() =>
    this.canViewAll()
      ? 'Todas las solicitudes de soporte y su estado.'
      : 'Tus solicitudes de soporte y su estado.',
  );
  protected readonly announcement = computed(() => {
    const data = this.page();
    return data && !this.loading() ? `${data.totalElements} tickets encontrados` : '';
  });

  // Búsqueda con espera: el texto local se sincroniza con la URL
  protected readonly searchDraft = signal('');
  private lastPushedSearch = '';

  // Tickets que se están tomando ahora mismo
  private readonly takingIds = signal<ReadonlySet<string>>(new Set());

  constructor() {
    // Si la URL cambia desde fuera (atrás, enlace, "limpiar"), el cuadro de búsqueda la sigue
    effect(() => {
      const fromUrl = this.state().search;
      if (fromUrl !== this.lastPushedSearch) {
        this.lastPushedSearch = fromUrl;
        this.searchDraft.set(fromUrl);
      }
    });

    toObservable(this.searchDraft)
      .pipe(skip(1), debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((text) => {
        const search = text.trim();
        if (search === this.state().search) return;
        this.lastPushedSearch = search;
        this.navigate({ search, page: 0 });
      });
  }

  protected countOf(view: TicketView): number | null {
    const state = this.summary.state();
    return viewCount(view, state.status === 'success' ? state.value : null);
  }

  protected tabParams(view: TicketView): Record<string, string> {
    return toUrlParams({ ...this.state(), view, page: 0 });
  }

  protected isTaking(id: string): boolean {
    return this.takingIds().has(id);
  }

  protected setCategory(event: Event): void {
    this.navigate({ categoryId: (event.target as HTMLSelectElement).value, page: 0 });
  }

  protected setPriority(event: Event): void {
    this.navigate({
      priority: (event.target as HTMLSelectElement).value as ListState['priority'],
      page: 0,
    });
  }

  protected onSort(sort: SortState): void {
    this.navigate({ sort, page: 0 });
  }

  protected onPage(page: number): void {
    this.navigate({ page });
  }

  protected onSize(size: number): void {
    this.navigate({ size, page: 0 });
  }

  protected clearFilters(): void {
    this.lastPushedSearch = '';
    this.searchDraft.set('');
    this.navigate({ search: '', categoryId: '', priority: '', page: 0 });
  }

  protected reload(): void {
    this.list.reload();
    this.summary.reload();
  }

  protected async take(ticket: TicketSummary): Promise<void> {
    if (this.isTaking(ticket.id)) return;
    this.takingIds.update((ids) => new Set(ids).add(ticket.id));
    try {
      await firstValueFrom(this.api.take(ticket.id));
      this.toast.success(`Tomaste el ticket ${ticket.ticketCode}.`);
    } catch (error) {
      this.toast.error(describeError(error));
    } finally {
      this.takingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(ticket.id);
        return next;
      });
      this.reload(); // tanto si salió bien como si alguien se nos adelantó, la lista debe reflejar la realidad
    }
  }

  private navigate(patch: Partial<ListState>): void {
    // Sin "merge": solo viven en la URL los valores que no son los de por defecto
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toUrlParams({ ...this.state(), ...patch }),
    });
  }
}
