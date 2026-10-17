import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
} from '@shared/ui';
import { AssetStatusChip } from '@shared/domain';
import { AssetsApi } from '@core/api/assets.api';
import { CatalogApi } from '@core/api/catalog.api';
import {
  ASSET_VIEWS,
  AssetListState,
  AssetView,
  assetViewCount,
  hasActiveAssetFilters,
  parseAssetListState,
  RawAssetParams,
  toAssetApiQuery,
  toAssetUrlParams,
} from './asset-query';
import { ASSET_SIZE_OPTIONS } from '@features/assets/asset-query';
import { loadable } from '@core/http/loadable';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, skip } from 'rxjs';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-asset-list-page',
  imports: [
    RouterLink,
    PageHeader,
    Button,
    Icon,
    Avatar,
    EmptyState,
    ErrorState,
    Skeleton,
    Pagination,
    SortHeader,
    AssetStatusChip,
  ],
  templateUrl: './asset-list-page.html',
  styleUrl: './asset-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetListPage {
  readonly estado = input<string>();
  readonly buscar = input<string>();
  readonly tipo = input<string>();
  readonly pagina = input<string>();
  readonly tamano = input<string>();
  readonly orden = input<string>();

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AssetsApi);
  private readonly catalog = inject(CatalogApi);

  protected readonly views = ASSET_VIEWS;
  protected readonly sizeOptions = ASSET_SIZE_OPTIONS;

  protected readonly state = computed<AssetListState>(() => {
    const raw: RawAssetParams = {
      estado: this.estado(),
      buscar: this.buscar(),
      tipo: this.tipo(),
      pagina: this.pagina(),
      tamano: this.tamano(),
      orden: this.orden(),
    };
    return parseAssetListState(raw);
  });
  protected readonly hasFilters = computed(() => hasActiveAssetFilters(this.state()));

  // Datos
  protected readonly list = loadable(
    () => toAssetApiQuery(this.state()),
    (query) => this.api.list(query),
  );
  protected readonly types = loadable(
    () => true,
    () => this.api.types(),
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
  protected readonly typeOptions = computed(() => this.types.value() ?? []);
  protected readonly counts = computed(() => {
    const state = this.summary.state();
    return state.status === 'success' ? (state.value.assets ?? null) : null;
  });
  protected readonly announcement = computed(() => {
    const data = this.page();
    return data && !this.loading() ? `${data.totalElements} equipos encontrados` : '';
  });

  // Búsqueda con espera: el texto local se sincroniza con la URL
  protected readonly searchDraft = signal('');
  private lastPushedSearch = '';

  constructor() {
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

  protected countOf(view: AssetView): number | null {
    return assetViewCount(view, this.counts());
  }

  protected tabParams(view: AssetView): Record<string, string> {
    return toAssetUrlParams({ ...this.state(), view, page: 0 });
  }

  protected setType(event: Event): void {
    this.navigate({ typeId: (event.target as HTMLSelectElement).value, page: 0 });
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
    this.navigate({ search: '', typeId: '', page: 0 });
  }

  protected reload(): void {
    this.list.reload();
    this.summary.reload();
  }

  private navigate(patch: Partial<AssetListState>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toAssetUrlParams({ ...this.state(), ...patch }),
    });
  }
}
