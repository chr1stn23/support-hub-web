import {
  AuditAction,
  AuditEntityType,
  AuditLogEntry,
  AuditResult,
  PageResponse,
} from '@core/api/models';
import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api-config';

export interface AuditQuery {
  readonly page: number;
  readonly size: number;
  readonly actorId?: string;
  readonly action?: AuditAction;
  readonly entityType?: AuditEntityType;
  readonly result?: AuditResult;
  /** Instantes ISO. */
  readonly from?: string;
  readonly to?: string;
}

@Service()
export class AuditApi {
  private readonly http = inject(HttpClient);

  list(query: AuditQuery): Observable<PageResponse<AuditLogEntry>> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);
    if (query.actorId) params = params.set('actorId', query.actorId);
    if (query.action) params = params.set('action', query.action);
    if (query.entityType) params = params.set('entityType', query.entityType);
    if (query.result) params = params.set('result', query.result);
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    return this.http.get<PageResponse<AuditLogEntry>>(`${API_BASE}/audit-logs`, { params });
  }
}
