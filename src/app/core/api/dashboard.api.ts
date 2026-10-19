import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE } from './api-config';
import type { DashboardReport } from './models';

@Service()
export class DashboardApi {
  private readonly http = inject(HttpClient);

  /** `days` de 1 a 365; el contenido depende del rol de quien consulta. */
  report(days: number): Observable<DashboardReport> {
    return this.http.get<DashboardReport>(`${API_BASE}/dashboard/summary`, {
      params: new HttpParams().set('days', days),
    });
  }
}
