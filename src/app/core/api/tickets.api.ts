import { inject, Service } from '@angular/core';
import {
  CreateTicketRequest,
  PageResponse,
  Ticket,
  TicketComment,
  TicketHistoryEvent,
  TicketPriority,
  TicketStatus,
  TicketSummary,
} from '@core/api/models';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '@core/api/api-config';

export interface TicketListQuery {
  readonly page: number;
  readonly size: number;
  readonly sort: string;
  readonly statuses: readonly TicketStatus[];
  readonly priorities: readonly TicketPriority[];
  readonly categoryId?: string;
  readonly assignedTo?: string;
  readonly unassigned?: boolean;
  readonly search?: string;
}

@Service()
export class TicketsApi {
  private readonly http = inject(HttpClient);

  list(query: TicketListQuery): Observable<PageResponse<TicketSummary>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size)
      .set('sort', query.sort);
    if (query.statuses.length > 0) params = params.set('status', query.statuses.join(','));
    if (query.priorities.length > 0) params = params.set('priority', query.priorities.join(','));
    if (query.categoryId) params = params.set('categoryId', query.categoryId);
    if (query.assignedTo) params = params.set('assignedTo', query.assignedTo);
    if (query.unassigned) params = params.set('unassigned', true);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<PageResponse<TicketSummary>>(`${API_BASE}/tickets`, { params });
  }

  get(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${API_BASE}/tickets/${id}`);
  }

  comments(id: string): Observable<TicketComment[]> {
    return this.http.get<TicketComment[]>(`${API_BASE}/tickets/${id}/comments`);
  }

  history(id: string): Observable<TicketHistoryEvent[]> {
    return this.http.get<TicketHistoryEvent[]>(`${API_BASE}/tickets/${id}/history`);
  }

  create(request: CreateTicketRequest): Observable<Ticket> {
    return this.http.post<Ticket>(`${API_BASE}/tickets`, request);
  }

  addComment(id: string, body: string): Observable<TicketComment> {
    return this.http.post<TicketComment>(`${API_BASE}/tickets/${id}/comments`, { body });
  }

  /** Tomar el ticket: el backend asigna a quien lo pide cuando no se indica un agente. */
  take(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(`${API_BASE}/tickets/${id}/assign`, {});
  }
}
