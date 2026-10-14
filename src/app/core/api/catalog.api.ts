import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AssetListItem, CategoryResponse, DashboardSummary } from '@core/api/models';
import { Observable } from 'rxjs';
import { API_BASE } from './api-config';

@Service()
export class CatalogApi {
  private readonly http = inject(HttpClient);

  categories(): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(`${API_BASE}/categories`);
  }

  /** Los equipos que tiene asignados la persona. */
  myAssets(): Observable<AssetListItem[]> {
    return this.http.get<AssetListItem[]>(`${API_BASE}/assets/mine`);
  }

  dashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${API_BASE}/dashboard/summary`);
  }
}
