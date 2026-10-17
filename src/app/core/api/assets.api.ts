import { AssetListItem, AssetStatus, AssetType, PageResponse } from '@core/api/models';
import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '@core/api/api-config';

export interface AssetListQuery {
  readonly page: number;
  readonly size: number;
  readonly sort: string;
  readonly status?: AssetStatus;
  readonly assetTypeId?: string;
  readonly search?: string;
}

@Service()
export class AssetsApi {
  private readonly http = inject(HttpClient);

  list(query: AssetListQuery): Observable<PageResponse<AssetListItem>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size)
      .set('sort', query.sort);
    if (query.status) params = params.set('status', query.status);
    if (query.assetTypeId) params = params.set('assetTypeId', query.assetTypeId);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<PageResponse<AssetListItem>>(`${API_BASE}/assets`, { params });
  }

  types(): Observable<AssetType[]> {
    return this.http.get<AssetType[]>(`${API_BASE}/asset-types`);
  }
}
