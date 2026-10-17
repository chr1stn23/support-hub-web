import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, EmptyState, ErrorState, Icon, PageHeader, Skeleton } from '@shared/ui';
import { AssetStatusChip } from '@shared/domain';
import { CatalogApi } from '@core/api/catalog.api';
import { loadable } from '@core/http/loadable';
import { AssetListItem } from '@core/api/models';

@Component({
  selector: 'app-my-assets-page',
  imports: [
    RouterLink,
    PageHeader,
    Button,
    Icon,
    EmptyState,
    ErrorState,
    Skeleton,
    AssetStatusChip,
  ],
  templateUrl: './my-assets-page.html',
  styleUrl: './my-assets-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyAssetsPage {
  private readonly catalog = inject(CatalogApi);

  protected readonly assets = loadable(
    () => true,
    () => this.catalog.myAssets(),
  );
  protected readonly items = this.assets.value;
  protected readonly error = computed(() => {
    const state = this.assets.state();
    return state.status === 'error' ? state.error : null;
  });

  protected readonly description = computed(() => {
    const count = this.items()?.length ?? 0;
    if (count === 0) return 'Aquí verás los equipos que tengas asignados.';
    return count === 1 ? 'Tienes 1 equipo asignado.' : `Tienes ${count} equipos asignados.`;
  });

  protected title(asset: AssetListItem): string {
    return [asset.brand, asset.model].filter(Boolean).join(' ') || asset.type;
  }
}
