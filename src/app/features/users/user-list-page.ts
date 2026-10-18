import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, firstValueFrom, skip } from 'rxjs';

import { UsersApi } from '@core/api/users.api';
import { AuthService } from '@core/auth/auth.service';
import { loadable } from '@core/http/loadable';
import { ROLE_LABEL, ROLE_ORDER, sortedRoleLabels } from '@shared/domain';
import {
  Button,
  Chip,
  DialogService,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Pagination,
  Skeleton,
  SortHeader,
  Time,
  type SortState,
} from '@shared/ui';
import type { UserFormData } from './user-dialog-data';
import { UserFormDialog } from './user-form-dialog';
import {
  RawUserParams,
  USER_SIZE_OPTIONS,
  USER_VIEWS,
  UserListState,
  UserView,
  hasActiveUserFilters,
  parseUserListState,
  toUserApiQuery,
  toUserUrlParams,
} from './user-query';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-user-list-page',
  imports: [
    RouterLink,
    PageHeader,
    Button,
    Chip,
    Icon,
    EmptyState,
    ErrorState,
    Skeleton,
    Pagination,
    SortHeader,
    Time,
  ],
  templateUrl: './user-list-page.html',
  styleUrl: './user-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListPage {
  readonly estado = input<string>();
  readonly rol = input<string>();
  readonly buscar = input<string>();
  readonly pagina = input<string>();
  readonly tamano = input<string>();
  readonly orden = input<string>();

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(UsersApi);
  private readonly auth = inject(AuthService);
  private readonly dialogs = inject(DialogService);

  protected readonly views = USER_VIEWS;
  protected readonly sizeOptions = USER_SIZE_OPTIONS;
  protected readonly roleOptions = ROLE_ORDER.map((value) => ({ value, label: ROLE_LABEL[value] }));
  protected readonly selfId = computed(() => this.auth.user()?.id ?? null);

  protected readonly state = computed<UserListState>(() => {
    const raw: RawUserParams = {
      estado: this.estado(),
      rol: this.rol(),
      buscar: this.buscar(),
      pagina: this.pagina(),
      tamano: this.tamano(),
      orden: this.orden(),
    };
    return parseUserListState(raw);
  });
  protected readonly hasFilters = computed(() => hasActiveUserFilters(this.state()));

  protected readonly list = loadable(
    () => toUserApiQuery(this.state()),
    (query) => this.api.list(query),
  );
  protected readonly page = this.list.value;
  protected readonly loading = computed(() => this.list.state().status === 'loading');
  protected readonly error = computed(() => {
    const state = this.list.state();
    return state.status === 'error' ? state.error : null;
  });
  protected readonly announcement = computed(() => {
    const data = this.page();
    return data && !this.loading() ? `${data.totalElements} usuarios encontrados` : '';
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

  protected roleLabels(roles: readonly (typeof ROLE_ORDER)[number][]): string[] {
    return sortedRoleLabels([...roles]);
  }

  protected tabParams(view: UserView): Record<string, string> {
    return toUserUrlParams({ ...this.state(), view, page: 0 });
  }

  protected setRole(event: Event): void {
    this.navigate({
      role: (event.target as HTMLSelectElement).value as UserListState['role'],
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
    this.navigate({ search: '', role: '', page: 0 });
  }

  protected async openCreate(): Promise<void> {
    const ref = this.dialogs.open<UserFormDialog, string | boolean, UserFormData>(UserFormDialog, {
      data: {},
      ariaLabel: 'Nuevo usuario',
      width: 'min(34rem, calc(100vw - 2rem))',
    });
    const result = await firstValueFrom(ref.closed, { defaultValue: false });
    if (typeof result === 'string') {
      void this.router.navigate(['/usuarios', result]); // el diálogo devuelve el id de la cuenta creada
    } else if (result) {
      this.list.reload();
    }
  }

  private navigate(patch: Partial<UserListState>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toUserUrlParams({ ...this.state(), ...patch }),
    });
  }
}
