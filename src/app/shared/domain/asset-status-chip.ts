import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AssetStatus } from '@core/api/models';

import { ASSET_STATUS } from './labels';
import { Chip } from '@shared/ui';

@Component({
  selector: 'app-asset-status',
  imports: [Chip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-chip [tone]="meta().tone" [voided]="!!meta().voided">{{
    meta().label
  }}</app-chip>`,
})
export class AssetStatusChip {
  readonly status = input.required<AssetStatus>();
  protected readonly meta = computed(() => ASSET_STATUS[this.status()]);
}
