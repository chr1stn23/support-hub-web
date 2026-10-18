import {
  AssetAssignment,
  AssetDetail,
  AssetListItem,
  AssetStatus,
  AssetType,
  AssignAssetRequest,
  CreateAssetRequest,
  PageResponse,
  TicketSummary,
  UpdateAssetRequest,
} from '@core/api/models';
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
  /** Solo los equipos que tiene esta persona. */
  readonly assignedTo?: string;
}

@Service()
export class AssetsApi {
  private readonly http = inject(HttpClient);

  private url(id: string): string {
    return `${API_BASE}/assets/${id}`;
  }

  list(query: AssetListQuery): Observable<PageResponse<AssetListItem>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size)
      .set('sort', query.sort);
    if (query.status) params = params.set('status', query.status);
    if (query.assetTypeId) params = params.set('assetTypeId', query.assetTypeId);
    if (query.search) params = params.set('search', query.search);
    if (query.assignedTo) params = params.set('assignedTo', query.assignedTo);
    return this.http.get<PageResponse<AssetListItem>>(`${API_BASE}/assets`, { params });
  }

  types(): Observable<AssetType[]> {
    return this.http.get<AssetType[]>(`${API_BASE}/asset-types`);
  }

  get(id: string): Observable<AssetDetail> {
    return this.http.get<AssetDetail>(this.url(id));
  }

  /** Del más reciente al más antiguo. */
  assignments(id: string): Observable<AssetAssignment[]> {
    return this.http.get<AssetAssignment[]>(`${this.url(id)}/assignments`);
  }

  /** Hasta 25 tickets que mencionan el equipo, los más recientes. */
  relatedTickets(id: string): Observable<TicketSummary[]> {
    return this.http.get<TicketSummary[]>(`${this.url(id)}/tickets`);
  }

  create(request: CreateAssetRequest): Observable<AssetDetail> {
    return this.http.post<AssetDetail>(`${API_BASE}/assets`, request);
  }

  update(id: string, request: UpdateAssetRequest): Observable<AssetDetail> {
    return this.http.patch<AssetDetail>(this.url(id), request);
  }

  assign(id: string, request: AssignAssetRequest): Observable<AssetDetail> {
    return this.http.post<AssetDetail>(`${this.url(id)}/assign`, request);
  }

  transfer(id: string, request: AssignAssetRequest): Observable<AssetDetail> {
    return this.http.post<AssetDetail>(`${this.url(id)}/transfer`, request);
  }

  returnAsset(id: string): Observable<AssetDetail> {
    return this.http.post<AssetDetail>(`${this.url(id)}/return`, {});
  }

  changeStatus(id: string, status: AssetStatus): Observable<AssetDetail> {
    return this.http.post<AssetDetail>(`${this.url(id)}/status`, { status });
  }
}
