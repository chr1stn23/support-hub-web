import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE } from './api-config';
import type { AppNotification, PageResponse } from './models';

export interface NotificationsQuery {
  readonly page: number;
  readonly size: number;
  readonly unreadOnly: boolean;
}

@Service()
export class NotificationsApi {
  private readonly http = inject(HttpClient);

  /** Las más recientes primero: el backend ignora cualquier orden que se le pida. */
  list(query: NotificationsQuery): Observable<PageResponse<AppNotification>> {
    const params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size)
      .set('unreadOnly', query.unreadOnly);
    return this.http.get<PageResponse<AppNotification>>(`${API_BASE}/notifications`, { params });
  }

  /** 404 si no existe o es de otra persona. */
  markRead(id: string): Observable<void> {
    return this.http.post<void>(`${API_BASE}/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${API_BASE}/notifications/read-all`, {});
  }
}
